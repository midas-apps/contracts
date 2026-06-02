// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasTimelockManager, GetOperationStatusResult, TimelockOperationStatus} from "../interfaces/IMidasTimelockManager.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

// TODO: add natspec
/**
 * @title MidasTimelockManager
 * @notice Manages timelock scheduling, security council votes, and operation challenges.
 * @author RedDuck Software
 */
contract MidasTimelockManager is IMidasTimelockManager, WithMidasAccessControl {
    using AccessControlUtilsLibrary for IMidasAccessControl;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /**
     * @dev internal storage for a timelock operation challenge
     */
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

    /**
     * @notice role that can execute timelock transactions
     */
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    /**
     * @notice role that can pause (challenge) timelock operations
     */
    bytes32 public constant TIMELOCK_CHALLENGER_ROLE =
        keccak256("TIMELOCK_CHALLENGER_ROLE");

    /**
     * @notice role that can set security council
     */
    bytes32 public constant SECURITY_COUNCIL_MANAGER_ROLE =
        keccak256("SECURITY_COUNCIL_MANAGER_ROLE");

    /**
     * @notice min security council members
     */
    uint256 public constant SECURITY_COUNCIL_MIN_MEMBERS = 5;

    /**
     * @notice max security council members
     */
    uint256 public constant SECURITY_COUNCIL_MAX_MEMBERS = 15;

    /**
     * @notice time after schedule when operation expires
     */
    uint256 public constant EXPIRY_PERIOD = 45 days;

    /**
     * @notice dispute period after execution approval
     */
    uint256 public constant DISPUTE_PERIOD = 3 days;

    /**
     * @notice hard cap for max pending operations per proposer
     */
    uint256 public constant MAX_PENDING_OPERATIONS_PER_PROPOSER = 100;

    /**
     * @inheritdoc IMidasTimelockManager
     */
    address public timelock;

    /**
     * @inheritdoc IMidasTimelockManager
     */
    uint256 public maxPendingOperationsPerProposer;

    /**
     * @inheritdoc IMidasTimelockManager
     */
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

    /**
     * @inheritdoc IMidasTimelockManager
     */
    mapping(bytes32 => uint256) public dataHashIndexes;

    /**
     * @inheritdoc IMidasTimelockManager
     */
    mapping(address => uint256) public proposerPendingOperationsCount;

    EnumerableSet.Bytes32Set private _pendingOperations;

    /**
     * @inheritdoc IMidasTimelockManager
     */
    bytes32 public pendingSetCouncilOperationId;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc IMidasTimelockManager
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
     * @inheritdoc IMidasTimelockManager
     */
    function initializeTimelock(address _timelock) external {
        require(
            accessControl.hasRole(_DEFAULT_ADMIN_ROLE, msg.sender),
            HasntRole(_DEFAULT_ADMIN_ROLE, msg.sender)
        );
        require(timelock == address(0), TimelockAlreadySet());
        require(_timelock != address(0), InvalidAddress(_timelock));
        timelock = _timelock;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function setMaxPendingOperationsPerProposer(
        uint256 _maxPendingOperationsPerProposer
    ) external onlyRole(_DEFAULT_ADMIN_ROLE, false) {
        _setMaxPendingOperationsPerProposer(_maxPendingOperationsPerProposer);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function setRoleDelays(bytes32[] memory roles, uint256[] memory delays)
        external
        onlyRole(_DEFAULT_ADMIN_ROLE, false)
    {
        require(roles.length == delays.length, MismatchingArrayLengths());

        for (uint256 i = 0; i < roles.length; ++i) {
            _roleTimelocks[roles[i]] = delays[i];
        }

        emit SetRoleDelays(roles, delays);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function setSecurityCouncil(address[] calldata members)
        external
        onlyRole(SECURITY_COUNCIL_MANAGER_ROLE, false)
    {
        uint256 version = securityCouncilVersion + 1;
        securityCouncilVersion = version;
        _setSecurityCouncil(members, version);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function scheduleTimelockOperations(
        address[] calldata targets,
        bytes[] calldata datas
    ) external {
        for (uint256 i = 0; i < targets.length; ++i) {
            _scheduleTimelockOperation(targets[i], datas[i]);
        }
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function scheduleTimelockOperation(address target, bytes calldata data)
        external
    {
        _scheduleTimelockOperation(target, data);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function executeTimelockOperation(address target, bytes calldata data)
        external
    {
        require(
            accessControl.hasRole(_DEFAULT_ADMIN_ROLE, msg.sender) ||
                accessControl.hasRole(EXECUTOR_ROLE, msg.sender),
            HasntRole(EXECUTOR_ROLE, msg.sender)
        );

        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, data);

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.NotPaused ||
                status == TimelockOperationStatus.ReadyToExecute,
            UnexpectedOperationStatus(status)
        );

        require(
            _timelock.isOperationReady(operationId),
            TimelockOperationNotReady()
        );

        _timelock.execute(target, 0, data, bytes32(0), bytes32(dataHashIndex));

        _resetPendingSetCouncilOperation(challenge);

        // updating state after execution to be able to verify tx against current context
        // in case of reentrancy timelock.execute will revert
        challenge.status = TimelockOperationStatus.Executed;
        dataHashIndexes[dataHash] = dataHashIndex + 1;
        --proposerPendingOperationsCount[challenge.operationProposer];
        require(_pendingOperations.remove(operationId), OperationNotPending());

        emit ExecuteTimelockOperation(msg.sender, operationId);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function pauseOperation(bytes32 operationId, uint8 pauseReasonCode)
        external
    {
        require(
            accessControl.hasRole(TIMELOCK_CHALLENGER_ROLE, msg.sender),
            HasntRole(TIMELOCK_CHALLENGER_ROLE, msg.sender)
        );

        require(_isPendingOperation(operationId), OperationNotPending());

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.NotPaused,
            UnexpectedOperationStatus(status)
        );

        uint256 councilVersion = securityCouncilVersion;
        challenge.status = TimelockOperationStatus.Paused;
        challenge.pauseReasonCode = pauseReasonCode;
        challenge.councilVersion = councilVersion;
        challenge.challenger = msg.sender;

        emit PauseTimelockOperation(
            msg.sender,
            operationId,
            pauseReasonCode,
            councilVersion
        );
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function voteForVeto(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            _securityCouncils[challenge.councilVersion].contains(msg.sender),
            NotInSecurityCouncil()
        );

        require(
            status == TimelockOperationStatus.Paused ||
                status == TimelockOperationStatus.ApprovedExecution ||
                status == TimelockOperationStatus.ReadyToExecute,
            UnexpectedOperationStatus(status)
        );

        require(challenge.votersForVeto.add(msg.sender), AlreadyVoted());

        if (
            challenge.votersForVeto.length() >=
            councilQuorum(challenge.councilVersion)
        ) {
            challenge.status = TimelockOperationStatus.ReadyToAbort;
        }

        emit PausedProposalVoteCast(msg.sender, operationId, false);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function voteForExecution(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        require(
            _securityCouncils[challenge.councilVersion].contains(msg.sender),
            NotInSecurityCouncil()
        );

        require(
            status == TimelockOperationStatus.Paused,
            UnexpectedOperationStatus(status)
        );

        require(challenge.votersForExecution.add(msg.sender), AlreadyVoted());
        require(!challenge.votersForVeto.contains(msg.sender), AlreadyVoted());

        if (
            challenge.votersForExecution.length() >=
            councilQuorum(challenge.councilVersion)
        ) {
            challenge.status = TimelockOperationStatus.ApprovedExecution;
            challenge.executionApprovedAt = uint32(block.timestamp);
        }

        emit PausedProposalVoteCast(msg.sender, operationId, true);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function abortOperation(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getOperationStatus(operationId);

        uint256 dataHashIndex = dataHashIndexes[challenge.dataHash];

        require(
            status == TimelockOperationStatus.ReadyToAbort ||
                status == TimelockOperationStatus.Expired,
            UnexpectedOperationStatus(status)
        );

        _resetPendingSetCouncilOperation(challenge);

        dataHashIndexes[challenge.dataHash] = dataHashIndex + 1;
        challenge.status = TimelockOperationStatus.Aborted;
        --proposerPendingOperationsCount[challenge.operationProposer];
        require(_pendingOperations.remove(operationId), OperationNotPending());

        TimelockController(payable(timelock)).cancel(operationId);

        emit AbortTimelockOperation(msg.sender, operationId, status);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        uint256 overrideDelay,
        address target,
        bytes calldata data
    ) external view returns (bool ready, bool timelocked) {
        uint256 delay = _getTimelockDelay(targetRole, overrideDelay);

        TimelockController _timelock = TimelockController(payable(timelock));
        (bytes32 operationId, , ) = _getOperationId(_timelock, target, data);

        if (!_isPendingOperation(operationId) && delay == 0) {
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

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getOriginalProposer(address target, bytes calldata data)
        external
        view
        returns (address)
    {
        TimelockController _timelock = TimelockController(payable(timelock));
        (bytes32 operationId, , ) = _getOperationId(_timelock, target, data);
        return _operationChallenges[operationId].operationProposer;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getRoleTimelockDelay(bytes32 role, uint256 overrideDelay)
        public
        view
        returns (
            uint256, /* delay */
            bool /* isDefault */
        )
    {
        uint256 delay = overrideDelay != AccessControlUtilsLibrary.NULL_DELAY
            ? overrideDelay
            : _roleTimelocks[role];
        uint256 actualDelay = delay == AccessControlUtilsLibrary.NULL_DELAY
            ? defaultDelay()
            : delay == AccessControlUtilsLibrary.NO_DELAY
            ? 0
            : delay;

        return (actualDelay, delay == 0);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function defaultDelay() public view virtual returns (uint256) {
        return 3600;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function councilQuorum(uint256 version) public view returns (uint8) {
        return uint8(_securityCouncils[version].length()) / 2 + 1;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
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

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getPendingOperations() external view returns (bytes32[] memory) {
        return _pendingOperations.values();
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
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

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getOperationStatus(bytes32 operationId)
        external
        view
        returns (TimelockOperationStatus status)
    {
        (status, ) = _getOperationStatus(operationId);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getOperationStatusRaw(bytes32 operationId)
        external
        view
        returns (TimelockOperationStatus status)
    {
        return _operationChallenges[operationId].status;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getSecurityCouncilMembers(uint256 version)
        external
        view
        returns (address[] memory)
    {
        return _securityCouncils[version].values();
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function getOperationId(address target, bytes calldata data)
        external
        view
        returns (bytes32 operationId)
    {
        (operationId, , ) = _getOperationId(
            TimelockController(payable(timelock)),
            target,
            data
        );
    }

    /**
     * @dev calculates and returns the actual status of an operation
     * @param operationId operation id
     * @return status actual operation status
     * @return challenge operation challenge
     */
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

    /**
     * @dev schedules a timelock operation
     * @param target target contract
     * @param data operation data
     */
    function _scheduleTimelockOperation(address target, bytes calldata data)
        private
    {
        require(target != timelock, InvalidAddress(target));

        address proposer = msg.sender;

        (bytes32 targetRole, uint256 overrideDelay) = _getTargetRole(
            target,
            data,
            proposer
        );

        uint256 delay = _getTimelockDelay(targetRole, overrideDelay);

        require(delay != 0, NoTimelockDelayForRole());

        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, data);

        bool isSetCouncil = target == address(this) &&
            _getFunctionSelector(data) == this.setSecurityCouncil.selector;

        ++proposerPendingOperationsCount[proposer];

        require(
            proposerPendingOperationsCount[proposer] <=
                maxPendingOperationsPerProposer,
            TooManyPendingOperations()
        );

        TimelockOperationChallenge storage challenge = _operationChallenges[
            operationId
        ];

        if (isSetCouncil) {
            require(
                pendingSetCouncilOperationId == bytes32(0),
                PendingSetCouncilOperationExists()
            );
            challenge.isSetCouncilOperation = true;
            pendingSetCouncilOperationId = operationId;
        }

        challenge.dataHash = dataHash;
        challenge.operationProposer = proposer;
        challenge.createdAt = uint32(block.timestamp);
        challenge.status = TimelockOperationStatus.NotPaused;

        require(_pendingOperations.add(operationId), OperationAlreadyPending());

        _timelock.schedule(
            target,
            0,
            data,
            bytes32(0),
            bytes32(dataHashIndex),
            delay
        );

        emit ScheduleTimelockOperation(proposer, operationId);
    }

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function _contractAdminRole() internal pure override returns (bytes32) {
        return _DEFAULT_ADMIN_ROLE;
    }

    /**
     * @dev sets security council under a specific version
     * @param members council member addresses
     * @param version council version
     */
    function _setSecurityCouncil(address[] calldata members, uint256 version)
        private
    {
        require(
            members.length >= SECURITY_COUNCIL_MIN_MEMBERS &&
                members.length <= SECURITY_COUNCIL_MAX_MEMBERS,
            InvalidSecurityCouncilMembersLength()
        );

        EnumerableSet.AddressSet storage securityCouncil = _securityCouncils[
            version
        ];

        for (uint256 i = 0; i < members.length; ++i) {
            require(members[i] != address(0), InvalidAddress(members[i]));
            require(
                securityCouncil.add(members[i]),
                InvalidAddress(members[i])
            );
        }

        emit SetSecurityCouncil(version, members);
    }

    /**
     * @dev sets max pending operations per proposer
     * @param _maxPendingOperationsPerProposer max pending operations per proposer
     */
    function _setMaxPendingOperationsPerProposer(
        uint256 _maxPendingOperationsPerProposer
    ) private {
        require(
            _maxPendingOperationsPerProposer > 0 &&
                _maxPendingOperationsPerProposer <=
                MAX_PENDING_OPERATIONS_PER_PROPOSER,
            InvalidMaxPendingOperationsPerProposer()
        );
        maxPendingOperationsPerProposer = _maxPendingOperationsPerProposer;

        emit SetMaxPendingOperationsPerProposer(
            _maxPendingOperationsPerProposer
        );
    }

    /**
     * @dev resets the pending set-council operation
     * if the operation is a set-council operation
     * @param challenge operation challenge
     */
    function _resetPendingSetCouncilOperation(
        TimelockOperationChallenge storage challenge
    ) private {
        if (!challenge.isSetCouncilOperation) {
            return;
        }

        pendingSetCouncilOperationId = bytes32(0);
    }

    /**
     * @dev gets the target role for a given operation
     * @param target target contract
     * @param data operation data
     * @param proposer operation proposer address
     * @return target role
     */
    function _getTargetRole(
        address target,
        bytes calldata data,
        address proposer
    )
        private
        view
        returns (
            bytes32, /* role */
            uint256 /* overrideDelay */
        )
    {
        (bool success, bytes memory err) = target.staticcall(data);

        require(!success, PreflightCallUnexpectedSuccess());

        (
            bytes32 role,
            uint256 overrideDelay,
            bool roleIsFunctionOperator,
            bool validateFunctionRole
        ) = _decodePreflightSucceededError(err);

        return (
            accessControl.validateFunctionAccess(
                role,
                roleIsFunctionOperator,
                proposer,
                _getFunctionSelector(data),
                validateFunctionRole
            ),
            overrideDelay
        );
    }

    /**
     * @dev gets the timelock operation id for a given target and data
     * @param _timelock timelock controller
     * @param target target contract
     * @param data operation data
     * @return operationId operation id
     * @return dataHash data hash
     * @return dataHashIndex data hash index
     */
    function _getOperationId(
        TimelockController _timelock,
        address target,
        bytes calldata data
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

    /**
     * @dev checks if an operation is pending
     * @param operationId operation id
     * @return true if the operation is pending
     */
    function _isPendingOperation(bytes32 operationId)
        private
        view
        returns (bool)
    {
        return _pendingOperations.contains(operationId);
    }

    /**
     * @dev gets the function selector from operation data
     * @param data operation data
     * @return function selector
     */
    function _getFunctionSelector(bytes calldata data)
        private
        pure
        returns (bytes4)
    {
        return bytes4(data);
    }

    /**
     * @dev gets the timelock delay for a given target and data
     * @param targetRole target role
     * @return delay timelock delay
     */
    function _getTimelockDelay(bytes32 targetRole, uint256 overrideDelay)
        private
        view
        returns (uint256 delay)
    {
        (delay, ) = getRoleTimelockDelay(targetRole, overrideDelay);
    }

    /**
     * @dev gets the keccak256 hash of a given target and data
     * @param target target contract
     * @param data operation data
     * @return data hash
     */
    function _getDataHash(address target, bytes calldata data)
        private
        pure
        returns (bytes32)
    {
        // adding 0 as msg.value to make hash generation future-proof
        return keccak256(abi.encodePacked(target, uint256(0), data));
    }

    /**
     * @dev decodes a `RolePreflightSucceeded` error
     * @param err error bytes
     * @return role role
     * @return overrideDelay override delay for the invocation
     * @return roleIsFunctionOperator whether the role is a function operator role
     * @return validateFunctionRole whether to validate the function role
     */
    function _decodePreflightSucceededError(bytes memory err)
        private
        pure
        returns (
            bytes32 role,
            uint256 overrideDelay,
            bool roleIsFunctionOperator,
            bool validateFunctionRole
        )
    {
        require(err.length == 132, InvalidPreflightError(err));

        bytes4 selector;

        // getting the selector of custom error
        assembly {
            selector := mload(add(err, 32))
        }

        // checking if the error is a RolePreflightSucceeded error
        require(
            selector == RolePreflightSucceeded.selector,
            InvalidPreflightError(err)
        );

        assembly {
            role := mload(add(err, 36))
            overrideDelay := mload(add(err, 68))
            roleIsFunctionOperator := mload(add(err, 100))
            validateFunctionRole := mload(add(err, 132))
        }
    }
}
