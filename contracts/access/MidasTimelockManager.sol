// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasTimelockManager} from "../interfaces/IMidasTimelockManager.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

enum TimelockOperationStatus {
    NotExist,
    NotPaused,
    Paused,
    ApprovedExecution,
    ReadyToExecute,
    ReadyToAbort,
    Expired,
    Aborted,
    Executed
}

struct TimelockOperationChallenge {
    TimelockOperationStatus status;
    uint256 councilVersion;
    address operationProposer;
    address challenger;
    uint32 createdAt;
    uint32 executionApprovedAt;
    uint8 pauseReasonCode;
    bool isSetCouncilOperation;
    bytes32 dataHash;
    EnumerableSet.AddressSet votersForExecution;
    EnumerableSet.AddressSet votersForVeto;
}

struct GetOperationStatusResult {
    TimelockOperationStatus status;
    uint32 createdAt;
    uint32 executionApprovedAt;
    uint8 pauseReasonCode;
    uint256 councilVersion;
    address operationProposer;
    address challenger;
    bytes32 dataHash;
    uint8 votesForExecution;
    uint8 votesForVeto;
    bool isSetCouncilOperation;
}

// TODO: add natspec
// TODO: add events
contract MidasTimelockManager is IMidasTimelockManager, WithMidasAccessControl {
    using AccessControlUtilsLibrary for IMidasAccessControl;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /**
     * @notice role that can execute timelock transactions
     */
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CHALLENGER_ROLE = keccak256("CHALLENGER_ROLE");
    bytes32 public constant COUNCIL_MANAGER_ROLE =
        keccak256("COUNCIL_MANAGER_ROLE");

    uint256 public constant SECURITY_COUNCIL_MIN_MEMBERS = 5;
    uint256 public constant SECURITY_COUNCIL_MAX_MEMBERS = 15;

    uint256 public constant EXPIRY_PERIOD = 45 days;
    uint256 public constant DISPUTE_PERIOD = 3 days;

    uint256 public constant MAX_PENDING_OPERATIONS_PER_PROPOSER = 100;

    /**
     * @notice address of the timelock controller
     * @return timelock address of the timelock controller
     */
    address public timelock;

    uint256 public maxPendingOperationsPerProposer;

    uint256 public securityCouncilVersion;

    /**
     * @dev timelock delay for each role
     */
    mapping(bytes32 => uint256) private _roleTimelocks;

    /**
     * @dev set of security council addresses by version
     */
    mapping(uint256 => EnumerableSet.AddressSet) private _securityCouncils;

    mapping(bytes32 => TimelockOperationChallenge) private _operationChallenges;

    mapping(bytes32 => uint256) public dataHashIndexes;

    mapping(address => uint256) public proposerPendingOperationsCount;

    EnumerableSet.Bytes32Set private _pendingOperations;

    bytes32 public pendingSetCouncilOperationId;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     * @param _maxPendingOperationsPerProposer maximum number of pending operations per proposer
     * @param _initSecurityCouncil initial security council members
     */
    function initialize(
        address _accessControl,
        uint256 _maxPendingOperationsPerProposer,
        address[] calldata _initSecurityCouncil
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);

        _setMaxPendingOperationsPerProposer(_maxPendingOperationsPerProposer);

        _setSecurityCouncil(_initSecurityCouncil, securityCouncilVersion);
    }

    /**
     * @notice initializes the timelock
     * @param _timelock address of the timelock controller
     * @dev can be called only by DEFAULT_ADMIN_ROLE
     */
    function initializeTimelock(address _timelock) external {
        require(
            accessControl.hasRole(_DEFAULT_ADMIN_ROLE, msg.sender),
            HasntRole(_DEFAULT_ADMIN_ROLE, msg.sender)
        );
        require(timelock == address(0), "MAC: timelock already set");
        require(_timelock != address(0), "MAC: invalid timelock");
        timelock = _timelock;
    }

    function setMaxPendingOperationsPerProposer(
        uint256 _maxPendingOperationsPerProposer
    ) external onlyRole(_DEFAULT_ADMIN_ROLE, false) {
        _setMaxPendingOperationsPerProposer(_maxPendingOperationsPerProposer);
    }

    function setRoleDelays(bytes32[] memory roles, uint256[] memory delays)
        external
        onlyRole(_DEFAULT_ADMIN_ROLE, false)
    {
        require(roles.length == delays.length, "MAC: invalid lengths");

        for (uint256 i = 0; i < roles.length; ++i) {
            _roleTimelocks[roles[i]] = delays[i];
        }
    }

    function getRoleTimelockDelay(bytes32 role)
        public
        view
        returns (
            uint256, /* delay */
            bool /* isDefault */
        )
    {
        uint256 delay = _roleTimelocks[role];
        uint256 actualDelay = delay == 0
            ? defaultDelay()
            : delay == type(uint256).max
            ? 0
            : delay;

        return (actualDelay, delay == 0);
    }

    function defaultDelay() public view virtual returns (uint256) {
        return 3600;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        address target,
        bytes calldata dataWithCaller
    ) external view returns (bool ready, bool timelocked) {
        (uint256 delay, ) = getRoleTimelockDelay(targetRole);

        TimelockController _timelock = TimelockController(payable(timelock));
        (bytes32 operationId, , ) = _getOperationId(
            _timelock,
            target,
            dataWithCaller
        );

        if (!_pendingOperations.contains(operationId) && delay == 0) {
            return (true, false);
        }

        (TimelockOperationStatus challengeStatus, ) = _getOperationStatus(
            operationId
        );

        if (challengeStatus == TimelockOperationStatus.ReadyToExecute) {
            return (true, true);
        }

        bool isTimelockPassed = _timelock.isOperationReady(operationId);

        if (isTimelockPassed) {
            return (true, true);
        }

        return (false, true);
    }

    function setSecurityCouncil(address[] calldata members)
        external
        onlyRole(COUNCIL_MANAGER_ROLE, false)
    {
        uint256 version = securityCouncilVersion + 1;
        securityCouncilVersion = version;
        _setSecurityCouncil(members, version);
    }

    function scheduleTimelockOperations(
        address[] calldata targets,
        bytes[] calldata datas
    ) external {
        for (uint256 i = 0; i < targets.length; ++i) {
            _scheduleTimelockOperation(targets[i], datas[i]);
        }
    }

    function scheduleTimelockOperation(address target, bytes calldata data)
        external
    {
        _scheduleTimelockOperation(target, data);
    }

    function executeTimelockOperation(
        address target,
        bytes calldata data,
        address originalProposer
    ) external {
        require(
            accessControl.hasRole(_DEFAULT_ADMIN_ROLE, msg.sender) ||
                accessControl.hasRole(EXECUTOR_ROLE, msg.sender),
            "MAC: unauthorized"
        );

        bytes memory dataWithCaller = AccessControlUtilsLibrary
            .appendAddressToData(data, originalProposer);

        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, dataWithCaller);

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.NotPaused ||
                status == TimelockOperationStatus.ReadyToExecute,
            "not ready to execute"
        );

        require(
            _timelock.isOperationReady(operationId),
            "timelock is not passed"
        );

        _timelock.execute(
            target,
            0,
            dataWithCaller,
            bytes32(0),
            bytes32(dataHashIndex)
        );

        // TODO: move to util
        if (challenge.isSetCouncilOperation) {
            pendingSetCouncilOperationId = bytes32(0);
        }
        // updating state after execution to be able to verify tx against current context
        // in case of reentrancy timelock.execute will revert
        challenge.status = TimelockOperationStatus.Executed;
        dataHashIndexes[dataHash] = dataHashIndex + 1;
        --proposerPendingOperationsCount[originalProposer];
        require(_pendingOperations.remove(operationId), "MAC: not pending");
    }

    function pauseOperation(bytes32 operationId, uint8 pauseReasonCode)
        external
    {
        require(
            accessControl.hasRole(CHALLENGER_ROLE, msg.sender),
            "MAC: unauthorized"
        );

        // TODO: move to util
        require(_pendingOperations.contains(operationId), "MAC: not pending");

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.NotPaused,
            "already challenged"
        );

        challenge.status = TimelockOperationStatus.Paused;
        challenge.pauseReasonCode = pauseReasonCode;
        challenge.councilVersion = securityCouncilVersion;
        challenge.challenger = msg.sender;
    }

    function voteForVeto(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            _securityCouncils[challenge.councilVersion].contains(msg.sender),
            "not in council"
        );

        require(
            status == TimelockOperationStatus.Paused ||
                status == TimelockOperationStatus.ApprovedExecution ||
                status == TimelockOperationStatus.ReadyToExecute,
            "not challenged or disputed"
        );

        require(
            challenge.votersForVeto.add(msg.sender),
            "already voted for veto"
        );

        if (
            challenge.votersForVeto.length() >=
            councilQuorum(challenge.councilVersion)
        ) {
            challenge.status = TimelockOperationStatus.ReadyToAbort;
        }
    }

    function voteForExecution(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            _securityCouncils[challenge.councilVersion].contains(msg.sender),
            "not in council"
        );

        require(
            status == TimelockOperationStatus.Paused,
            "not challenged or approved execution"
        );

        require(
            challenge.votersForExecution.add(msg.sender),
            "already voted for execution"
        );
        require(
            !challenge.votersForVeto.contains(msg.sender),
            "veto has already been voted for"
        );

        if (
            challenge.votersForExecution.length() >=
            councilQuorum(challenge.councilVersion)
        ) {
            challenge.status = TimelockOperationStatus.ApprovedExecution;
            challenge.executionApprovedAt = uint32(block.timestamp);
        }
    }

    function abortOperation(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        uint256 dataHashIndex = dataHashIndexes[challenge.dataHash];

        require(
            status == TimelockOperationStatus.ReadyToAbort ||
                status == TimelockOperationStatus.Expired,
            "status"
        );

        // TODO: move to util
        if (challenge.isSetCouncilOperation) {
            pendingSetCouncilOperationId = bytes32(0);
        }

        dataHashIndexes[challenge.dataHash] = dataHashIndex + 1;
        challenge.status = TimelockOperationStatus.Aborted;
        --proposerPendingOperationsCount[challenge.operationProposer];
        require(_pendingOperations.remove(operationId), "MAC: not pending");

        TimelockController(payable(timelock)).cancel(operationId);
    }

    function councilQuorum(uint256 version) public view returns (uint256) {
        return (_securityCouncils[version].length() / 2 + 1);
    }

    function getCouncilMemberVoteStatus(
        bytes32 operationId,
        address councilMember
    ) external view returns (bool votedForExecution, bool votedForVeto) {
        (, TimelockOperationChallenge storage challenge) = _getOperationStatus(
            operationId
        );
        return (
            challenge.votersForExecution.contains(councilMember),
            challenge.votersForVeto.contains(councilMember)
        );
    }

    function getPendingOperations() external view returns (bytes32[] memory) {
        return _pendingOperations.values();
    }

    function getOperationDetails(bytes32 operationId)
        external
        view
        returns (GetOperationStatusResult memory result)
    {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        result.status = status;
        result.createdAt = challenge.createdAt;
        result.executionApprovedAt = challenge.executionApprovedAt;
        result.pauseReasonCode = challenge.pauseReasonCode;
        result.councilVersion = challenge.councilVersion;
        result.operationProposer = challenge.operationProposer;
        result.challenger = challenge.challenger;
        result.dataHash = challenge.dataHash;
        result.votesForExecution = uint8(challenge.votersForExecution.length());
        result.votesForVeto = uint8(challenge.votersForVeto.length());
        result.isSetCouncilOperation = challenge.isSetCouncilOperation;
    }

    function getOperationStatus(bytes32 operationId)
        external
        view
        returns (TimelockOperationStatus status)
    {
        (status, ) = _getOperationStatus(operationId);
    }

    function getOperationStatusRaw(bytes32 operationId)
        external
        view
        returns (TimelockOperationStatus status)
    {
        return _operationChallenges[operationId].status;
    }

    function getSecurityCouncilMembers(uint256 version)
        external
        view
        returns (address[] memory)
    {
        return _securityCouncils[version].values();
    }

    function _getOperationStatus(bytes32 operationId)
        private
        view
        returns (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        )
    {
        challenge = _operationChallenges[operationId];
        status = challenge.status;

        if (
            status != TimelockOperationStatus.NotPaused &&
            status != TimelockOperationStatus.Paused &&
            status != TimelockOperationStatus.ApprovedExecution
        ) {
            return (status, challenge);
        }

        uint256 passedSinceCreated = block.timestamp - challenge.createdAt;

        if (passedSinceCreated >= EXPIRY_PERIOD) {
            status = TimelockOperationStatus.Expired;
            return (status, challenge);
        }

        if (
            status == TimelockOperationStatus.ApprovedExecution &&
            block.timestamp - challenge.executionApprovedAt >= DISPUTE_PERIOD
        ) {
            status = TimelockOperationStatus.ReadyToExecute;
            return (status, challenge);
        }

        return (status, challenge);
    }

    function _scheduleTimelockOperation(address target, bytes calldata data)
        private
    {
        require(target != timelock, "MAC: target cannot be timelock");

        address proposer = msg.sender;
        bytes memory dataWithCaller = AccessControlUtilsLibrary
            .appendAddressToData(data, proposer);
        bytes32 targetRole = _getTargetRole(target, dataWithCaller);

        (uint256 delay, ) = getRoleTimelockDelay(targetRole);

        require(delay != 0, "MAC: no timelock");

        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, dataWithCaller);

        bool isSetCouncil = target == address(this) &&
            _getFunctionSelector(dataWithCaller) ==
            this.setSecurityCouncil.selector;

        ++proposerPendingOperationsCount[proposer];

        require(
            proposerPendingOperationsCount[proposer] <=
                maxPendingOperationsPerProposer,
            "MAC: too many pending operations"
        );

        TimelockOperationChallenge storage challenge = _operationChallenges[
            operationId
        ];

        if (isSetCouncil) {
            require(
                pendingSetCouncilOperationId == bytes32(0),
                "MAC: pending council set operation already exists"
            );
            challenge.isSetCouncilOperation = true;
            pendingSetCouncilOperationId = operationId;
        }

        challenge.dataHash = dataHash;
        challenge.operationProposer = proposer;
        challenge.createdAt = uint32(block.timestamp);
        challenge.status = TimelockOperationStatus.NotPaused;

        require(_pendingOperations.add(operationId), "MAC: already pending");

        _timelock.schedule(
            target,
            0,
            dataWithCaller,
            bytes32(0),
            bytes32(dataHashIndex),
            delay
        );
    }

    function _contractAdminRole() internal pure override returns (bytes32) {
        return _DEFAULT_ADMIN_ROLE;
    }

    function _setSecurityCouncil(address[] calldata members, uint256 version)
        private
    {
        require(
            members.length >= SECURITY_COUNCIL_MIN_MEMBERS &&
                members.length <= SECURITY_COUNCIL_MAX_MEMBERS,
            "MAC: invalid members length"
        );

        EnumerableSet.AddressSet storage securityCouncil = _securityCouncils[
            version
        ];

        for (uint256 i = 0; i < members.length; ++i) {
            require(members[i] != address(0), InvalidAddress(members[i]));
            require(securityCouncil.add(members[i]), "MAC: already in council");
        }
    }

    function _setMaxPendingOperationsPerProposer(
        uint256 _maxPendingOperationsPerProposer
    ) private {
        require(
            _maxPendingOperationsPerProposer > 0 &&
                _maxPendingOperationsPerProposer <=
                MAX_PENDING_OPERATIONS_PER_PROPOSER,
            "MAC: invalid max pending operations per proposer"
        );
        maxPendingOperationsPerProposer = _maxPendingOperationsPerProposer;
    }

    function _getDataHash(address target, bytes memory data)
        private
        pure
        returns (bytes32)
    {
        // adding 0 as msg.value to make hash generation future-proof
        return keccak256(abi.encodePacked(target, uint256(0), data));
    }

    function _getTargetRole(address target, bytes memory data)
        private
        returns (bytes32)
    {
        // TODO: convert to staticcall?
        (bool success, bytes memory err) = target.call(data);

        require(!success, "MAC: expected to revert");

        (
            bytes32 role,
            bool roleIsFunctionOperator,
            bool validateFunctionRole
        ) = _decodePreflightSucceededError(err);

        if (!roleIsFunctionOperator) {
            require(
                !accessControl.isUserFacingRole(role),
                "MAC: user facing role"
            );
        }

        return
            accessControl.validateFunctionAccess(
                role,
                roleIsFunctionOperator,
                msg.sender,
                _getFunctionSelector(data),
                validateFunctionRole
            );
    }

    function getOperationId(address target, bytes calldata dataWithCaller)
        external
        view
        returns (bytes32 operationId)
    {
        (operationId, , ) = _getOperationId(
            TimelockController(payable(timelock)),
            target,
            dataWithCaller
        );
    }

    function _getOperationId(
        TimelockController _timelock,
        address target,
        bytes memory data
    )
        private
        view
        returns (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        )
    {
        dataHash = _getDataHash(target, data);
        dataHashIndex = dataHashIndexes[dataHash];

        operationId = _timelock.hashOperation(
            target,
            0,
            data,
            bytes32(0),
            bytes32(dataHashIndex)
        );
    }

    function _getFunctionSelector(bytes memory data)
        private
        pure
        returns (bytes4)
    {
        return bytes4(data);
    }

    function _decodePreflightSucceededError(bytes memory err)
        private
        pure
        returns (
            bytes32 role,
            bool roleIsFunctionOperator,
            bool validateFunctionRole
        )
    {
        // TODO: decode bools as well
        require(err.length == 100, "MAC: invalid error length");

        bytes4 selector;

        // getting the selector of custom error
        assembly {
            selector := mload(add(err, 32))
        }

        // checking if the error is a RolePreflightSucceeded error
        require(selector == RolePreflightSucceeded.selector, "MAC: expected");

        assembly {
            role := mload(add(err, 36))
            roleIsFunctionOperator := mload(add(err, 68))
            validateFunctionRole := mload(add(err, 100))
        }
    }
}
