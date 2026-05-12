// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasTimelockManager} from "../interfaces/IMidasTimelockManager.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

enum TimelockOperationChallengeStatus {
    NotChallenged,
    Challenged,
    Disputed,
    ReadyToExecute,
    ReadyToCancel,
    Cancelled,
    Executed
}

struct TimelockOperationChallenge {
    TimelockOperationChallengeStatus status;
    uint256 timerStartedAt;
    uint256 votesFor;
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
            TimelockOperationChallengeStatus challengeStatus,

        ) = _getTimelockChallengedOperationStatus(
                operationId,
                dataHash,
                dataHashIndex
            );

        if (
            challengeStatus != TimelockOperationChallengeStatus.NotChallenged &&
            challengeStatus != TimelockOperationChallengeStatus.ReadyToExecute
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

    function scheduleTimelockTransactions(
        address[] calldata targets,
        bytes[] calldata datas
    ) external {
        for (uint256 i = 0; i < targets.length; ++i) {
            _scheduleTimelockTransaction(targets[i], datas[i]);
        }
    }

    function executeTimelockTransaction(
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
            TimelockOperationChallengeStatus status,
            TimelockOperationChallenge storage challenge
        ) = _getTimelockChallengedOperationStatus(
                operationId,
                dataHash,
                dataHashIndex
            );

        require(
            status == TimelockOperationChallengeStatus.NotChallenged ||
                status == TimelockOperationChallengeStatus.ReadyToExecute,
            "not ready to execute"
        );

        _timelock.execute(
            target,
            0,
            dataWithCaller,
            bytes32(0),
            bytes32(dataHashIndex)
        );

        challenge.status = TimelockOperationChallengeStatus.Executed;
        _dataHashIndexes[dataHash] = dataHashIndex + 1;
    }

    function challengeTransaction(bytes32 operationId) external {
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
            TimelockOperationChallengeStatus status,
            TimelockOperationChallenge storage challenge,
            ,

        ) = _getTimelockChallengedOperationStatus(operationId);

        require(
            status == TimelockOperationChallengeStatus.NotChallenged,
            "already challenged"
        );

        challenge.status = TimelockOperationChallengeStatus.Challenged;
        challenge.timerStartedAt = block.timestamp;
    }

    function supportExecution(bytes32 operationId) external {
        require(_securityCouncil.contains(msg.sender), "not in council");

        (
            TimelockOperationChallengeStatus status,
            TimelockOperationChallenge storage challenge,
            ,

        ) = _getTimelockChallengedOperationStatus(operationId);

        require(
            status == TimelockOperationChallengeStatus.Challenged ||
                status == TimelockOperationChallengeStatus.Disputed,
            "not challenged or disputed"
        );

        require(!challenge.voted[msg.sender], "already voted");

        challenge.voted[msg.sender] = true;
        ++challenge.votesFor;

        if (challenge.votesFor >= councilQuorum()) {
            challenge.status = TimelockOperationChallengeStatus.ReadyToExecute;
        } else if (status == TimelockOperationChallengeStatus.Challenged) {
            challenge.status = TimelockOperationChallengeStatus.Disputed;
            challenge.timerStartedAt = block.timestamp;
        }
    }

    // TODO: add AC
    function cancelTransaction(bytes32 operationId) external {
        (
            TimelockOperationChallengeStatus status,
            TimelockOperationChallenge storage challenge,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getTimelockChallengedOperationStatus(operationId);

        require(
            status == TimelockOperationChallengeStatus.ReadyToCancel,
            "status"
        );

        _dataHashIndexes[dataHash] = dataHashIndex + 1;
        challenge.status = TimelockOperationChallengeStatus.Cancelled;

        TimelockController(payable(timelock)).cancel(operationId);
    }

    function councilQuorum() public view returns (uint256) {
        return (_securityCouncil.length() / 2 + 1);
    }

    function _getTimelockOperationStatus(
        bytes32 operationId,
        TimelockController _timelock
    )
        internal
        view
        returns (bool operationExists, bool operationReadyToExecute)
    {
        operationExists = _timelock.isOperation(operationId);
        operationReadyToExecute = _timelock.isOperationReady(operationId);
    }

    function _getTimelockChallengedOperationStatus(bytes32 operationId)
        internal
        view
        returns (
            TimelockOperationChallengeStatus status,
            TimelockOperationChallenge storage challenge,
            bytes32 dataHash,
            uint256 dataHashIndex
        )
    {
        dataHash = _operationDataHashes[operationId];
        dataHashIndex = _dataHashIndexes[dataHash];
        (status, challenge) = _getTimelockChallengedOperationStatus(
            operationId,
            dataHash,
            dataHashIndex
        );
    }

    function _getTimelockChallengedOperationStatus(
        bytes32 operationId,
        bytes32 dataHash,
        uint256 dataHashIndex
    )
        internal
        view
        returns (
            TimelockOperationChallengeStatus status,
            TimelockOperationChallenge storage challenge
        )
    {
        dataHash = _operationDataHashes[operationId];
        dataHashIndex = _dataHashIndexes[dataHash];
        challenge = _operationChallenges[operationId][dataHashIndex];
        status = challenge.status;

        if (
            status != TimelockOperationChallengeStatus.Challenged &&
            status != TimelockOperationChallengeStatus.Disputed
        ) {
            return (status, challenge);
        }

        if (challenge.votesFor >= councilQuorum()) {
            status = TimelockOperationChallengeStatus.ReadyToExecute;
            return (status, challenge);
        }

        uint256 period = status == TimelockOperationChallengeStatus.Challenged
            ? CHALLENGE_PERIOD
            : DISPUTE_PERIOD;

        uint256 timePassed = block.timestamp - challenge.timerStartedAt;

        if (timePassed >= period) {
            status = TimelockOperationChallengeStatus.ReadyToCancel;
        }

        return (status, challenge);
    }

    function _scheduleTimelockTransaction(address target, bytes calldata data)
        internal
    {
        require(target != timelock, "MAC: target cannot be timelock");

        bytes memory dataWithCaller = AccessControlUtilsLibrary
            .appendAddressToData(data, msg.sender);
        bytes32 targetRole = _getTargetRole(target, dataWithCaller);

        uint256 delay = roleTimelocks[targetRole];

        require(delay != type(uint256).max, "MAC: no timelock");

        // TODO: replace 3600 with the default delay that is passed in the initializer
        delay = delay == 0 ? 3600 : delay;

        (
            bytes32 operationId,
            bytes32 dataHash,
            uint256 dataHashIndex
        ) = _getOperationId(
                TimelockController(payable(timelock)),
                target,
                dataWithCaller
            );

        _operationDataHashes[operationId] = dataHash;

        TimelockController(payable(timelock)).schedule(
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
        internal
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

    function _getOperationId(
        TimelockController _timelock,
        address target,
        bytes memory data
    )
        internal
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
