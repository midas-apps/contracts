// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasTimelockManager, GetOperationStatusResult, TimelockOperationStatus} from "../interfaces/IMidasTimelockManager.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title MidasTimelockManager
 * @notice Manages timelock scheduling, security council votes and operation details
 * @author RedDuck Software
 */
contract MidasTimelockManager is IMidasTimelockManager, WithMidasAccessControl {
    using AccessControlUtilsLibrary for IMidasAccessControl;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /**
     * @dev internal storage for a timelock operation details
     */
    struct TimelockOperationDetails {
        TimelockOperationStatus status;
        uint256 councilVersion;
        address operationProposer;
        address pauser;
        uint32 createdAt;
        uint32 executionApprovedAt;
        uint8 pauseReasonCode;
        bool isSetCouncilOperation;
        bytes32 dataHash;
        EnumerableSet.AddressSet votersForExecution;
        EnumerableSet.AddressSet votersForVeto;
    }

    /**
     * @notice role that can pause timelock operations
     */
    bytes32 public constant TIMELOCK_OPERATION_PAUSER_ROLE =
        keccak256("TIMELOCK_OPERATION_PAUSER_ROLE");

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
     * @dev set of security council addresses by version
     */
    mapping(uint256 => EnumerableSet.AddressSet) private _securityCouncils;

    mapping(bytes32 => TimelockOperationDetails) private _operationDetails;

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
     * @dev validates that the caller has the contract admin role without timelock
     * @param validateFunctionRole whether to validate the function role
     */
    modifier onlyContractAdminNoTimelock(bool validateFunctionRole) {
        _validateFunctionAccessWithoutTimelock(
            contractAdminRole(),
            false,
            msg.sender,
            validateFunctionRole
        );
        _;
    }

    /**
     * @dev validates that the caller has the contract admin role without function role
     */
    modifier onlyContractAdminNoFunctionRole() {
        _validateFunctionAccessWithTimelock(
            contractAdminRole(),
            AccessControlUtilsLibrary.NULL_DELAY,
            false,
            msg.sender,
            false
        );
        _;
    }

    /**
     * @notice Initializes the contract
     * @param _accessControl MidasAccessControl address
     * @param _maxPendingOperationsPerProposer max pending ops per proposer
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
     * @notice Initializes the timelock controller
     * @param _timelock timelock controller address
     */
    function initializeTimelock(address _timelock)
        external
        onlyContractAdminNoTimelock(false)
    {
        require(timelock == address(0), TimelockAlreadySet());
        require(_timelock != address(0), InvalidAddress(_timelock));
        timelock = _timelock;
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function setMaxPendingOperationsPerProposer(
        uint256 _maxPendingOperationsPerProposer
    ) external onlyContractAdminNoFunctionRole {
        _setMaxPendingOperationsPerProposer(_maxPendingOperationsPerProposer);
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
        onlyContractAdminNoTimelock(true)
    {
        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, data);

        (
            TimelockOperationStatus status,
            TimelockOperationDetails storage opDetails
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

        _resetPendingSetCouncilOperation(opDetails);

        // updating state after execution to be able to verify tx against current context
        // in case of reentrancy timelock.execute will revert
        opDetails.status = TimelockOperationStatus.Executed;
        dataHashIndexes[dataHash] = dataHashIndex + 1;
        --proposerPendingOperationsCount[opDetails.operationProposer];
        require(_pendingOperations.remove(operationId), OperationNotPending());

        emit ExecuteTimelockOperation(msg.sender, operationId);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function pauseOperation(bytes32 operationId, uint8 pauseReasonCode)
        external
        onlyRoleNoTimelock(TIMELOCK_OPERATION_PAUSER_ROLE, false)
    {
        require(_isPendingOperation(operationId), OperationNotPending());

        (
            TimelockOperationStatus status,
            TimelockOperationDetails storage opDetails
        ) = _getOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.NotPaused,
            UnexpectedOperationStatus(status)
        );

        uint256 councilVersion = securityCouncilVersion;
        opDetails.status = TimelockOperationStatus.Paused;
        opDetails.pauseReasonCode = pauseReasonCode;
        opDetails.councilVersion = councilVersion;
        opDetails.pauser = msg.sender;

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
            TimelockOperationDetails storage opDetails
        ) = _getOperationStatus(operationId);

        require(
            _securityCouncils[opDetails.councilVersion].contains(msg.sender),
            NotInSecurityCouncil()
        );

        require(
            status == TimelockOperationStatus.Paused ||
                status == TimelockOperationStatus.ApprovedExecution ||
                status == TimelockOperationStatus.ReadyToExecute,
            UnexpectedOperationStatus(status)
        );

        require(opDetails.votersForVeto.add(msg.sender), AlreadyVoted());

        if (
            opDetails.votersForVeto.length() >=
            councilQuorum(opDetails.councilVersion)
        ) {
            opDetails.status = TimelockOperationStatus.ReadyToAbort;
        }

        emit PausedProposalVoteCast(msg.sender, operationId, false);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function voteForExecution(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationDetails storage opDetails
        ) = _getOperationStatus(operationId);

        require(
            _securityCouncils[opDetails.councilVersion].contains(msg.sender),
            NotInSecurityCouncil()
        );

        require(
            status == TimelockOperationStatus.Paused,
            UnexpectedOperationStatus(status)
        );

        require(opDetails.votersForExecution.add(msg.sender), AlreadyVoted());
        require(!opDetails.votersForVeto.contains(msg.sender), AlreadyVoted());

        if (
            opDetails.votersForExecution.length() >=
            councilQuorum(opDetails.councilVersion)
        ) {
            opDetails.status = TimelockOperationStatus.ApprovedExecution;
            opDetails.executionApprovedAt = uint32(block.timestamp);
        }

        emit PausedProposalVoteCast(msg.sender, operationId, true);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function abortOperation(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationDetails storage opDetails
        ) = _getOperationStatus(operationId);

        uint256 dataHashIndex = dataHashIndexes[opDetails.dataHash];

        require(
            status == TimelockOperationStatus.ReadyToAbort ||
                status == TimelockOperationStatus.Expired,
            UnexpectedOperationStatus(status)
        );

        _resetPendingSetCouncilOperation(opDetails);

        dataHashIndexes[opDetails.dataHash] = dataHashIndex + 1;
        opDetails.status = TimelockOperationStatus.Aborted;
        --proposerPendingOperationsCount[opDetails.operationProposer];
        require(_pendingOperations.remove(operationId), OperationNotPending());

        TimelockController(payable(timelock)).cancel(operationId);

        emit AbortTimelockOperation(msg.sender, operationId, status);
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        uint32 overrideDelay,
        address target,
        bytes calldata data
    ) external view returns (bool ready, bool timelocked) {
        (uint32 delay, ) = accessControl.getRoleTimelockDelay(
            targetRole,
            overrideDelay
        );

        TimelockController _timelock = TimelockController(payable(timelock));
        (bytes32 operationId, , ) = _getOperationId(_timelock, target, data);

        if (!_isPendingOperation(operationId) && delay == 0) {
            return (true, false);
        }

        (TimelockOperationStatus opStatus, ) = _getOperationStatus(operationId);

        if (opStatus == TimelockOperationStatus.ReadyToExecute) {
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
        return _operationDetails[operationId].operationProposer;
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
        (, TimelockOperationDetails storage opDetails) = _getOperationStatus(
            operationId
        );
        return (
            opDetails.votersForExecution.contains(councilMember),
            opDetails.votersForVeto.contains(councilMember)
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
            TimelockOperationDetails storage opDetails
        ) = _getOperationStatus(operationId);

        result.status = status;
        result.createdAt = opDetails.createdAt;
        result.executionApprovedAt = opDetails.executionApprovedAt;
        result.pauseReasonCode = opDetails.pauseReasonCode;
        result.councilVersion = opDetails.councilVersion;
        result.operationProposer = opDetails.operationProposer;
        result.pauser = opDetails.pauser;
        result.dataHash = opDetails.dataHash;
        result.votesForExecution = uint8(opDetails.votersForExecution.length());
        result.votesForVeto = uint8(opDetails.votersForVeto.length());
        result.isSetCouncilOperation = opDetails.isSetCouncilOperation;
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
        return _operationDetails[operationId].status;
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
     * @return opDetails operation details
     */
    function _getOperationStatus(bytes32 operationId)
        private
        view
        returns (
            TimelockOperationStatus status,
            TimelockOperationDetails storage opDetails
        )
    {
        opDetails = _operationDetails[operationId];
        status = opDetails.status;

        if (
            status != TimelockOperationStatus.NotPaused &&
            status != TimelockOperationStatus.Paused &&
            status != TimelockOperationStatus.ApprovedExecution
        ) {
            return (status, opDetails);
        }

        uint256 passedSinceCreated = block.timestamp - opDetails.createdAt;

        if (passedSinceCreated >= EXPIRY_PERIOD) {
            status = TimelockOperationStatus.Expired;
            return (status, opDetails);
        }

        if (
            status == TimelockOperationStatus.ApprovedExecution &&
            block.timestamp - opDetails.executionApprovedAt >= DISPUTE_PERIOD
        ) {
            status = TimelockOperationStatus.ReadyToExecute;
            return (status, opDetails);
        }

        return (status, opDetails);
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

        (bytes32 targetRole, uint32 overrideDelay) = _getTargetRole(
            target,
            data,
            proposer
        );

        (uint32 delay, ) = accessControl.getRoleTimelockDelay(
            targetRole,
            overrideDelay
        );

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

        TimelockOperationDetails storage opDetails = _operationDetails[
            operationId
        ];

        if (isSetCouncil) {
            require(
                pendingSetCouncilOperationId == bytes32(0),
                PendingSetCouncilOperationExists()
            );
            opDetails.isSetCouncilOperation = true;
            pendingSetCouncilOperationId = operationId;
        }

        opDetails.dataHash = dataHash;
        opDetails.operationProposer = proposer;
        opDetails.createdAt = uint32(block.timestamp);
        opDetails.status = TimelockOperationStatus.NotPaused;

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
    function contractAdminRole() public pure override returns (bytes32) {
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
     * @param opDetails operation details
     */
    function _resetPendingSetCouncilOperation(
        TimelockOperationDetails storage opDetails
    ) private {
        if (!opDetails.isSetCouncilOperation) {
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
            uint32 /* overrideDelay */
        )
    {
        (bool success, bytes memory err) = target.staticcall(data);
        require(!success, PreflightCallUnexpectedSuccess());
        bytes4 selector = _getFunctionSelector(data);

        (
            bytes32 role,
            uint32 overrideDelay,
            bool roleIsFunctionOperator,
            bool validateFunctionRole
        ) = _decodePreflightSucceededError(err);

        return (
            accessControl.validateFunctionAccess(
                role,
                overrideDelay,
                roleIsFunctionOperator,
                proposer,
                selector,
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
            uint32 overrideDelay,
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
