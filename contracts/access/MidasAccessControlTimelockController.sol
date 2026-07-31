// SPDX-License-Identifier: BUSL-1.1
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
}
