// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";
import {MidasAuthLibrary} from "../libraries/MidasAuthLibrary.sol";

/**
 * @title Blacklistable
 * @notice Base contract that implements basic functions and modifiers
 * to work with blacklistable
 * @author RedDuck Software
 */
abstract contract Blacklistable is WithMidasAccessControl {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev checks that a given `account` doesnt have blacklisted role
     */
    modifier onlyNotBlacklisted(address account) {
        _onlyNotBlacklisted(account);
        _;
    }

    /**
     * @dev checks that a given `account` doesnt have blacklisted role
     */
    function _onlyNotBlacklisted(address account) internal view {
        MidasAuthLibrary.requireNotBlacklisted(
            accessControl,
            account,
            MidasAuthLibrary.DEFAULT_BLACKLISTED_ROLE
        );
    }
}
