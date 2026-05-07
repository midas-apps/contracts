// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";

/**
 * @title MidasAccessControlTimelockController
 * @notice TimelockController for Midas Protocol that is controlled by MidasTimelockManager
 * @author RedDuck Software
 */
contract MidasAccessControlTimelockController is
    TimelockControllerUpgradeable,
    MidasInitializable
{
    /**
     * @notice address of MidasTimelockManager contract
     */
    address public timelockManager;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _timelockManager address of MidasTimelockManager contract
     */
    function initialize(address _timelockManager) external initializer {
        address[] memory managerArray = new address[](1);
        managerArray[0] = _timelockManager;

        __TimelockController_init(0, managerArray, managerArray, address(0));

        timelockManager = _timelockManager;
    }

    // /**
    //  * @inheritdoc IMidasAccessControlTimelockController
    //  * @notice schedules a new operation and saves original caller for the operation
    //  * @param originalCaller original caller for the operation
    //  */
    // function schedule(
    //     address target,
    //     uint256 value,
    //     bytes calldata data,
    //     address originalCaller,
    //     bytes32 predecessor,
    //     bytes32 salt,
    //     uint256 delay
    // ) public override {
    //     super.schedule(target, value, data, predecessor, salt, delay);
    //     bytes32 id = hashOperation(target, value, data, predecessor, salt);
    //     originalCaller[id] = originalCaller;
    //     emit OriginalCallerSet(id, originalCaller);
    // }

    // /**
    //  * @inheritdoc TimelockControllerUpgradeable
    //  * @notice forbidden to execute batch operations
    //  */
    // function executeBatch(
    //     address[] calldata, /* targets */
    //     uint256[] calldata, /* values */
    //     bytes[] calldata, /* payloads */
    //     bytes32, /* predecessor */
    //     bytes32 /* salt */
    // ) public payable virtual {
    //     revert("MACTC: Forbidden");
    // }

    // function execute(
    //     address target,
    //     uint256 value,
    //     bytes calldata data,
    //     bytes32 predecessor,
    //     bytes32 salt
    // ) public payable virtual {
    //     super.execute(target, value, data, predecessor, salt);
    //     bytes32 id = hashOperation(target, value, data, predecessor, salt);
    //     delete originalCaller[id];
    //     delete
    //     emit OperationReset(id);
    // }
}
