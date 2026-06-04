// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @notice Timelock operation status
 * @dev Computed status may differ from stored status (expiry, dispute period).
 */
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

/**
 * @notice Operation details returned by `getOperationDetails`
 */
struct GetOperationStatusResult {
    /// @notice current status
    TimelockOperationStatus status;
    /// @notice block timestamp when operation was scheduled
    uint32 createdAt;
    /// @notice block timestamp when execution was approved by council
    uint32 executionApprovedAt;
    /// @notice pause reason code set by challenger
    uint8 pauseReasonCode;
    /// @notice security council version at pause time
    uint256 councilVersion;
    /// @notice address that scheduled the operation
    address operationProposer;
    /// @notice address that paused the operation
    address challenger;
    /// @notice hash of target, value and data
    bytes32 dataHash;
    /// @notice number of council votes for execution
    uint8 votesForExecution;
    /// @notice number of council votes for veto
    uint8 votesForVeto;
    /// @notice true if operation updates security council
    bool isSetCouncilOperation;
}

/**
 * @title IMidasTimelockManager
 * @notice Interface for the MidasTimelockManager
 * @author RedDuck Software
 */
interface IMidasTimelockManager {
    /**
     * @notice Preflight call succeeded with role info
     * @param role role used for the call
     * @param overrideDelay override delay for the invocation
     * @param roleIsFunctionOperator true if role is function operator
     * @param validateFunctionRole true if function role should be validated
     */
    error RolePreflightSucceeded(
        bytes32 role,
        uint256 overrideDelay,
        bool roleIsFunctionOperator,
        bool validateFunctionRole
    );

    /**
     * @notice Timelock address is already set
     */
    error TimelockAlreadySet();

    /**
     * @notice Array arguments have different lengths
     */
    error MismatchingArrayLengths();

    /**
     * @notice Operation status is not valid for this action
     * @param actualStatus current operation status
     */
    error UnexpectedOperationStatus(TimelockOperationStatus actualStatus);

    /**
     * @notice Operation is not in the pending set
     */
    error OperationNotPending();

    /**
     * @notice Operation is already pending
     */
    error OperationAlreadyPending();

    /**
     * @notice Timelock delay has not passed yet
     */
    error TimelockOperationNotReady();

    /**
     * @notice Caller is not a security council member for this operation
     */
    error NotInSecurityCouncil();

    /**
     * @notice Council member already voted
     */
    error AlreadyVoted();

    /**
     * @notice Role has no timelock delay configured
     */
    error NoTimelockDelayForRole();

    /**
     * @notice Proposer has too many pending operations
     */
    error TooManyPendingOperations();

    /**
     * @notice Pending set-council operation already exists
     */
    error PendingSetCouncilOperationExists();

    /**
     * @notice Security council size is out of allowed range
     */
    error InvalidSecurityCouncilMembersLength();

    /**
     * @notice Max pending operations value is invalid
     */
    error InvalidMaxPendingOperationsPerProposer();

    /**
     * @notice Target call should have reverted on preflight
     */
    error PreflightCallUnexpectedSuccess();

    /**
     * @notice Preflight revert data is invalid
     * @param err revert bytes
     */
    error InvalidPreflightError(bytes err);

    /**
     * @param roles role ids
     * @param delays delay values per role
     */
    event SetRoleDelays(bytes32[] roles, uint256[] delays);

    /**
     * @param maxPendingOperationsPerProposer new limit
     */
    event SetMaxPendingOperationsPerProposer(
        uint256 maxPendingOperationsPerProposer
    );

    /**
     * @param version new security council version
     * @param members council member addresses
     */
    event SetSecurityCouncil(uint256 indexed version, address[] members);

    /**
     * @param caller operation proposer
     * @param operationId scheduled operation id
     */
    event ScheduleTimelockOperation(
        address indexed caller,
        bytes32 indexed operationId
    );

    /**
     * @param caller challenger address
     * @param operationId paused operation id
     * @param pauseReasonCode pause reason code
     * @param councilVersion security council version at pause
     */
    event PauseTimelockOperation(
        address indexed caller,
        bytes32 indexed operationId,
        uint8 indexed pauseReasonCode,
        uint256 councilVersion
    );

    /**
     * @param caller executor address
     * @param operationId executed operation id
     */
    event ExecuteTimelockOperation(
        address indexed caller,
        bytes32 indexed operationId
    );

    /**
     * @param caller council member address
     * @param operationId operation id
     * @param votedForExecution true for execution vote, false for veto vote
     */
    event PausedProposalVoteCast(
        address indexed caller,
        bytes32 indexed operationId,
        bool indexed votedForExecution
    );

    /**
     * @param caller address that aborted the operation
     * @param operationId aborted operation id
     * @param status status before abort
     */
    event AbortTimelockOperation(
        address indexed caller,
        bytes32 indexed operationId,
        TimelockOperationStatus status
    );

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
    ) external;

    /**
     * @notice Sets the timelock controller address
     * @param _timelock timelock controller address
     */
    function initializeTimelock(address _timelock) external;

    /**
     * @notice Sets the default delay
     * @param _defaultDelay default delay in seconds
     */
    function setDefaultDelay(uint256 _defaultDelay) external;

    /**
     * @notice Sets max pending operations per proposer
     * @param _maxPendingOperationsPerProposer new limit
     */
    function setMaxPendingOperationsPerProposer(
        uint256 _maxPendingOperationsPerProposer
    ) external;

    /**
     * @notice Sets timelock delay per role
     * @param roles role ids
     * @param delays delay values (0 = default, max uint = no delay)
     */
    function setRoleDelays(bytes32[] memory roles, uint256[] memory delays)
        external;

    /**
     * @notice Sets a new security council version
     * @param members council member addresses
     */
    function setSecurityCouncil(address[] calldata members) external;

    /**
     * @notice Schedules multiple timelock operations
     * @param targets target contracts
     * @param datas calldata for each target
     */
    function scheduleTimelockOperations(
        address[] calldata targets,
        bytes[] calldata datas
    ) external;

    /**
     * @notice Schedules one timelock operation
     * @param target target contract
     * @param data calldata
     */
    function scheduleTimelockOperation(address target, bytes calldata data)
        external;

    /**
     * @notice Executes a scheduled timelock operation
     * @param target target contract
     * @param data operation data
     */
    function executeTimelockOperation(address target, bytes calldata data)
        external;

    /**
     * @notice Pauses (challenges) a pending operation
     * @param operationId operation id
     * @param pauseReasonCode reason code set by challenger
     */
    function pauseOperation(bytes32 operationId, uint8 pauseReasonCode)
        external;

    /**
     * @notice Security council votes to abort the operation
     * @param operationId operation id
     */
    function voteForVeto(bytes32 operationId) external;

    /**
     * @notice Security council votes to allow execution
     * @param operationId operation id
     */
    function voteForExecution(bytes32 operationId) external;

    /**
     * @notice Aborts operation after veto quorum or expiry
     * @param operationId operation id
     */
    function abortOperation(bytes32 operationId) external;

    /**
     * @notice Whether the function is ready to execute
     * @param targetRole role used for delay lookup
     * @param overrideDelay override delay for the invocation
     * @param target target contract
     * @param data operation data
     * @return ready true if call can proceed
     * @return timelocked true if execution goes through timelock
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        uint256 overrideDelay,
        address target,
        bytes calldata data
    ) external view returns (bool ready, bool timelocked);

    /**
     * @notice Returns original proposer for a pending operation
     * @param target target contract
     * @param data operation data
     * @return proposer address
     */
    function getOriginalProposer(address target, bytes calldata data)
        external
        view
        returns (address);

    /**
     * @notice Returns timelock delay for a role
     * @param role role id
     * @param overrideDelay override delay for the invocation
     * @return delay effective delay in seconds
     * @return isDefault true if role uses default delay
     */
    function getRoleTimelockDelay(bytes32 role, uint256 overrideDelay)
        external
        view
        returns (uint256 delay, bool isDefault);

    /**
     * @notice Default timelock delay when role delay is not set
     * @return delay delay in seconds
     */
    function defaultDelay() external view returns (uint256 delay);

    /**
     * @notice Votes needed for council quorum at a version
     * @param version security council version
     * @return quorum required votes
     */
    function councilQuorum(uint256 version)
        external
        view
        returns (uint8 quorum);

    /**
     * @notice Whether a council member voted on an operation
     * @param operationId operation id
     * @param councilMember member address
     * @return votedForExecution true if voted for execution
     * @return votedForVeto true if voted for veto
     */
    function getCouncilMemberVoteStatus(
        bytes32 operationId,
        address councilMember
    ) external view returns (bool votedForExecution, bool votedForVeto);

    /**
     * @notice Returns all pending operation ids
     * @return operationIds pending operation ids
     */
    function getPendingOperations()
        external
        view
        returns (bytes32[] memory operationIds);

    /**
     * @notice Returns full operation details
     * @param operationId operation id
     * @return result operation details
     */
    function getOperationDetails(bytes32 operationId)
        external
        view
        returns (GetOperationStatusResult memory result);

    /**
     * @notice Returns operation status (with expiry/dispute rules applied)
     * @param operationId operation id
     * @return status current status
     */
    function getOperationStatus(bytes32 operationId)
        external
        view
        returns (TimelockOperationStatus status);

    /**
     * @notice Returns stored operation status without adjustments
     * @param operationId operation id
     * @return status stored status
     */
    function getOperationStatusRaw(bytes32 operationId)
        external
        view
        returns (TimelockOperationStatus status);

    /**
     * @notice Returns security council members for a version
     * @param version security council version
     * @return members member addresses
     */
    function getSecurityCouncilMembers(uint256 version)
        external
        view
        returns (address[] memory members);

    /**
     * @notice Returns operation id for target and data
     * @param target target contract
     * @param data operation data
     * @return operationId operation id
     */
    function getOperationId(address target, bytes calldata data)
        external
        view
        returns (bytes32 operationId);

    /**
     * @notice Timelock controller address
     * @return timelockAddress timelock controller
     */
    function timelock() external view returns (address timelockAddress);

    /**
     * @notice Max pending operations per proposer
     * @return value current limit
     */
    function maxPendingOperationsPerProposer() external view returns (uint256);

    /**
     * @notice Current security council version
     * @return version council version
     */
    function securityCouncilVersion() external view returns (uint256);

    /**
     * @notice Data hash index used for operation id salt
     * @param dataHash operation data hash
     * @return index current index for this data hash
     */
    function dataHashIndexes(bytes32 dataHash) external view returns (uint256);

    /**
     * @notice Pending operations count for a proposer
     * @param proposer proposer address
     * @return count pending count
     */
    function proposerPendingOperationsCount(address proposer)
        external
        view
        returns (uint256);

    /**
     * @notice Pending set-security-council operation id, if any
     * @return operationId operation id or zero
     */
    function pendingSetCouncilOperationId() external view returns (bytes32);
}
