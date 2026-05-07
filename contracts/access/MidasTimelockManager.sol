// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {IMidasTimelockManager} from "../interfaces/IMidasTimelockManager.sol";

contract MidasTimelockManager is IMidasTimelockManager, WithMidasAccessControl {
    /**
     * @notice role that can execute timelock transactions
     */
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

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
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     */
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    /**
     * @notice initializes the timelock
     * @param _timelock address of the timelock controller
     * @dev can be called only by DEFAULT_ADMIN_ROLE
     */
    function initializeTimelock(address _timelock) external {
        _onlyRole(_DEFAULT_ADMIN_ROLE, msg.sender);
        require(timelock == address(0), "MAC: timelock already set");
        require(_timelock != address(0), "MAC: invalid timelock");
        timelock = _timelock;
    }

    function setRoleTimelocks(bytes32[] memory roles, uint256[] memory delays)
        external
    {
        // TODO: check the role admin instead of default admin
        _onlyRole(_DEFAULT_ADMIN_ROLE, msg.sender);
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
        bytes calldata data,
        address originalCaller
    ) external view returns (bool ready, bool timelocked) {
        uint256 delay = roleTimelocks[targetRole];

        TimelockController _timelock = TimelockController(payable(timelock));
        bytes32 operationId = _timelock.hashOperation(
            target,
            0,
            _appendCallerToCalldata(data, originalCaller),
            bytes32(0),
            bytes32(0)
        );

        bool isOperation = _timelock.isOperation(operationId);

        if (!isOperation && delay == 0) {
            return (true, false);
        }

        bool isReadyToExecute = _timelock.isOperationReady(operationId);

        if (isReadyToExecute) {
            return (true, true);
        } else {
            return (false, true);
        }
    }

    function _appendCallerToCalldata(bytes calldata data, address caller)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(data, caller);
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
            msg.sender == originalCaller ||
                accessControl.hasRole(EXECUTOR_ROLE, msg.sender),
            "MAC: unauthorized"
        );

        TimelockController(payable(timelock)).execute(
            target,
            0,
            _appendCallerToCalldata(data, originalCaller),
            bytes32(0),
            bytes32(0)
        );
    }

    function _scheduleTimelockTransaction(address target, bytes calldata data)
        internal
    {
        bytes memory dataWithCaller = _appendCallerToCalldata(data, msg.sender);
        bytes32 targetRole = _getTargetRole(target, dataWithCaller);

        uint256 delay = roleTimelocks[targetRole];

        require(delay != type(uint256).max, "MAC: no timelock");

        // TODO: replace 3600 with the default delay that is passed in the initializer
        delay = delay == 0 ? 3600 : (delay == type(uint256).max ? 0 : delay);

        TimelockController(payable(timelock)).schedule(
            target,
            0,
            dataWithCaller,
            bytes32(0),
            bytes32(0),
            delay
        );
    }

    function _getTargetRole(address target, bytes memory data)
        private
        returns (bytes32)
    {
        (bool success, bytes memory err) = target.call(data);

        require(!success, "MAC: expected to revert");

        return _decodePreflightSucceededError(err);
    }

    function _decodePreflightSucceededError(bytes memory err)
        private
        pure
        returns (bytes32 role)
    {
        require(err.length == 36, "MAC: invalid error length");

        bytes4 selector;

        // getting the selector of custom error
        assembly {
            selector := mload(add(err, 32))
        }

        // checking if the error is a RolePreflightSucceeded error
        require(selector == RolePreflightSucceeded.selector, "MAC: expected");

        assembly {
            role := mload(add(err, 36))
        }
    }
}
