// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasTimelockManager} from "../interfaces/IMidasTimelockManager.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

enum TimelockOperationStatus {
    NotChallenged,
    Challenged,
    Disputed,
    ReadyToExecute,
    ReadyToAbort,
    Aborted,
    Executed
}

struct TimelockOperationChallenge {
    TimelockOperationStatus status;
    uint256 challengedAt;
    uint256 firstDisputedAt;
    uint256 votesForDispute;
    mapping(address => bool) voted;
}

// TODO: add natspec
// TODO: add events
contract MidasTimelockManager is IMidasTimelockManager, WithMidasAccessControl {
    using AccessControlUtilsLibrary for IMidasAccessControl;
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     * @notice role that can execute timelock transactions
     */
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CHALLENGER_ROLE = keccak256("CHALLENGER_ROLE");
    bytes32 public constant COUNCIL_MANAGER_ROLE =
        keccak256("COUNCIL_MANAGER_ROLE");

    uint256 public constant SECURITY_COUNCIL_MIN_MEMBERS = 5;
    uint256 public constant CHALLENGE_PERIOD = 3 days;
    uint256 public constant DISPUTE_PERIOD = CHALLENGE_PERIOD;

    /**
     * @notice address of the timelock controller
     * @return timelock address of the timelock controller
     */
    address public timelock;

    /**
     * @notice timelock delay for each role
     */
    mapping(bytes32 => uint256) public roleTimelocks;

    /**
     * @dev set of security council addresses
     */
    EnumerableSet.AddressSet private _securityCouncil;

    mapping(bytes32 => mapping(uint256 => TimelockOperationChallenge))
        private _operationChallenges;

    mapping(bytes32 => uint256) private _dataHashIndexes;

    mapping(bytes32 => bytes32) private _operationDataHashes;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     */
    function initialize(
        address _accessControl,
        address[] memory _initSecurityCouncil
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);

        require(
            _initSecurityCouncil.length >= SECURITY_COUNCIL_MIN_MEMBERS,
            "MAC: not enough members"
        );

        for (uint256 i = 0; i < _initSecurityCouncil.length; ++i) {
            require(
                _securityCouncil.add(_initSecurityCouncil[i]),
                "already in council"
            );
        }
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

    function setRoleTimelocks(bytes32[] memory roles, uint256[] memory delays)
        external
        onlyRole(_DEFAULT_ADMIN_ROLE, false)
    {
        require(roles.length == delays.length, "MAC: invalid lengths");

        for (uint256 i = 0; i < roles.length; ++i) {
            roleTimelocks[roles[i]] = delays[i];
        }
    }

    /**
     * @inheritdoc IMidasTimelockManager
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        address target,
        bytes calldata dataWithCaller
    ) external view returns (bool ready, bool timelocked) {
        uint256 delay = roleTimelocks[targetRole];

        TimelockController _timelock = TimelockController(payable(timelock));
        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, dataWithCaller);

        bool isOperation = _timelock.isOperation(operationId);

        if (!isOperation && delay == 0) {
            return (true, false);
        }

        (
            TimelockOperationStatus challengeStatus,

        ) = _getChallengedOperationStatus(operationId, dataHash, dataHashIndex);

        if (
            challengeStatus != TimelockOperationStatus.NotChallenged &&
            challengeStatus != TimelockOperationStatus.ReadyToExecute
        ) {
            return (false, true);
        }

        bool isReadyToExecute = _timelock.isOperationReady(operationId);

        if (isReadyToExecute) {
            return (true, true);
        } else {
            return (false, true);
        }
    }

    function addSecurityCouncilMember(address member)
        external
        onlyRole(COUNCIL_MANAGER_ROLE, false)
    {
        require(_securityCouncil.add(member), "MAC: already in council");
    }

    function removeSecurityCouncilMember(address member)
        external
        onlyRole(COUNCIL_MANAGER_ROLE, false)
    {
        require(_securityCouncil.remove(member), "MAC: not in council");
        require(
            _securityCouncil.length() >= SECURITY_COUNCIL_MIN_MEMBERS,
            "MAC: not enough members"
        );
    }

    function scheduleTimelockOperations(
        address[] calldata targets,
        bytes[] calldata datas
    ) external {
        for (uint256 i = 0; i < targets.length; ++i) {
            _scheduleTimelockTransaction(targets[i], datas[i]);
        }
    }

    function scheduleTimelockOperation(address target, bytes calldata data)
        external
    {
        _scheduleTimelockTransaction(target, data);
    }

    function executeTimelockOperation(
        address target,
        bytes calldata data,
        address originalCaller
    ) external {
        require(
            accessControl.hasRole(_DEFAULT_ADMIN_ROLE, msg.sender) ||
                accessControl.hasRole(EXECUTOR_ROLE, msg.sender),
            "MAC: unauthorized"
        );

        bytes memory dataWithCaller = AccessControlUtilsLibrary
            .appendAddressToData(data, originalCaller);

        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, dataWithCaller);

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getChallengedOperationStatus(operationId, dataHash, dataHashIndex);

        require(
            status == TimelockOperationStatus.NotChallenged ||
                status == TimelockOperationStatus.ReadyToExecute,
            "not ready to execute"
        );

        _timelock.execute(
            target,
            0,
            dataWithCaller,
            bytes32(0),
            bytes32(dataHashIndex)
        );

        challenge.status = TimelockOperationStatus.Executed;
        _dataHashIndexes[dataHash] = dataHashIndex + 1;
    }

    function challengeOperation(bytes32 operationId) external {
        require(
            accessControl.hasRole(CHALLENGER_ROLE, msg.sender),
            "MAC: unauthorized"
        );

        (
            bool operationExists,
            bool operationReadyToExecute
        ) = _getTimelockOperationStatus(
                operationId,
                TimelockController(payable(timelock))
            );

        require(
            operationExists && !operationReadyToExecute,
            "operation does not exist"
        );

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge,
            ,

        ) = _getChallengedOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.NotChallenged,
            "already challenged"
        );

        challenge.status = TimelockOperationStatus.Challenged;
        challenge.challengedAt = block.timestamp;
    }

    function disputeOperationChallenge(bytes32 operationId) external {
        require(_securityCouncil.contains(msg.sender), "not in council");

        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge,
            ,

        ) = _getChallengedOperationStatus(operationId);

        require(
            status == TimelockOperationStatus.Challenged ||
                status == TimelockOperationStatus.Disputed,
            "not challenged or disputed"
        );

        require(!challenge.voted[msg.sender], "already voted");

        challenge.voted[msg.sender] = true;
        ++challenge.votesForDispute;

        if (status == TimelockOperationStatus.Challenged) {
            challenge.status = TimelockOperationStatus.Disputed;
            challenge.firstDisputedAt = block.timestamp;
        }
    }

    // TODO: add AC
    function abortOperation(bytes32 operationId) external {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getChallengedOperationStatus(operationId);

        require(status == TimelockOperationStatus.ReadyToAbort, "status");

        _dataHashIndexes[dataHash] = dataHashIndex + 1;
        challenge.status = TimelockOperationStatus.Aborted;

        TimelockController(payable(timelock)).cancel(operationId);
    }

    function councilQuorum() public view returns (uint256) {
        return (_securityCouncil.length() / 2 + 1);
    }

    function _getTimelockOperationStatus(
        bytes32 operationId,
        TimelockController _timelock
    )
        private
        view
        returns (bool operationExists, bool operationReadyToExecute)
    {
        operationExists = _timelock.isOperation(operationId);
        operationReadyToExecute = _timelock.isOperationReady(operationId);
    }

    function getCouncilMemberDisputeVoteStatus(
        bytes32 operationId,
        address councilMember
    ) external view returns (bool) {
        (
            ,
            TimelockOperationChallenge storage challenge,
            ,

        ) = _getChallengedOperationStatus(operationId);
        return challenge.voted[councilMember];
    }

    function getChallengedOperationStatus(bytes32 operationId)
        external
        view
        returns (
            TimelockOperationStatus, /* status */
            uint256, /* challengedAt */
            uint256, /* firstDisputedAt */
            uint256, /* votesForDispute */
            bytes32, /* dataHash */
            uint256 /* dataHashIndex */
        )
    {
        (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getChallengedOperationStatus(operationId);

        return (
            status,
            challenge.challengedAt,
            challenge.firstDisputedAt,
            challenge.votesForDispute,
            dataHash,
            dataHashIndex
        );
    }

    function _getChallengedOperationStatus(bytes32 operationId)
        private
        view
        returns (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge,
            bytes32 dataHash,
            uint256 dataHashIndex
        )
    {
        dataHash = _operationDataHashes[operationId];
        dataHashIndex = _dataHashIndexes[dataHash];
        (status, challenge) = _getChallengedOperationStatus(
            operationId,
            dataHash,
            dataHashIndex
        );
    }

    function _getChallengedOperationStatus(
        bytes32 operationId,
        bytes32 dataHash,
        uint256 dataHashIndex
    )
        private
        view
        returns (
            TimelockOperationStatus status,
            TimelockOperationChallenge storage challenge
        )
    {
        dataHash = _operationDataHashes[operationId];
        dataHashIndex = _dataHashIndexes[dataHash];
        challenge = _operationChallenges[operationId][dataHashIndex];
        status = challenge.status;

        if (
            status != TimelockOperationStatus.Challenged &&
            status != TimelockOperationStatus.Disputed
        ) {
            return (status, challenge);
        }

        uint256 period = status == TimelockOperationStatus.Challenged
            ? CHALLENGE_PERIOD
            : DISPUTE_PERIOD;

        uint256 timePassed = block.timestamp -
            (
                status == TimelockOperationStatus.Challenged
                    ? challenge.challengedAt
                    : challenge.firstDisputedAt
            );

        if (timePassed >= period) {
            if (challenge.votesForDispute >= councilQuorum()) {
                status = TimelockOperationStatus.ReadyToExecute;
                return (status, challenge);
            } else {
                status = TimelockOperationStatus.ReadyToAbort;
            }
        }

        return (status, challenge);
    }

    function _scheduleTimelockTransaction(address target, bytes calldata data)
        private
    {
        require(target != timelock, "MAC: target cannot be timelock");

        bytes memory dataWithCaller = AccessControlUtilsLibrary
            .appendAddressToData(data, msg.sender);
        bytes32 targetRole = _getTargetRole(target, dataWithCaller);

        uint256 delay = roleTimelocks[targetRole];

        require(delay != type(uint256).max, "MAC: no timelock");

        // TODO: replace 3600 with the default delay that is passed in the initializer
        delay = delay == 0 ? 3600 : delay;

        TimelockController _timelock = TimelockController(payable(timelock));

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(_timelock, target, dataWithCaller);

        _operationDataHashes[operationId] = dataHash;

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

        return
            accessControl.validateFunctionAccess(
                role,
                roleIsFunctionOperator,
                msg.sender,
                _getFunctionSelector(data),
                validateFunctionRole
            );
    }

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
        dataHashIndex = _dataHashIndexes[dataHash];

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
