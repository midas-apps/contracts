// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";

/**
 * @title Greenlistable
 * @notice Base contract that implements basic functions and modifiers
 * to work with greenlistable
 * @author RedDuck Software
 */
abstract contract Greenlistable is WithMidasAccessControl {
    /**
     * @notice is greenlist enabled
     */
    bool public greenlistEnabled;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @param enable enable
     */
    event SetGreenlistEnable(bool enable);

    /**
     * @dev checks that a given `account` has `greenlistedRole()`
     */
    modifier onlyGreenlisted(address account) {
        if (greenlistEnabled) {
            AccessControlUtilsLibrary.requireGreenlisted(
                accessControl,
                account,
                greenlistedRole()
            );
        }
        _;
    }

    /**
     * @notice enable or disable greenlist.
     * can be called only from permissioned actor.
     * @param enable enable
     */
    function setGreenlistEnable(bool enable) external onlyContractAdmin {
        require(greenlistEnabled != enable, SameBoolValue(enable));
        greenlistEnabled = enable;
        emit SetGreenlistEnable(enable);
    }

    /**
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function greenlistedRole() public view virtual returns (bytes32);
}
