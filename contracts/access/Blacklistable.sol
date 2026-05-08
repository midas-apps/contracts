// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";

/**
 * @title Blacklistable
 * @notice Base contract that implements basic functions and modifiers
 * to work with blacklistable
 * @author RedDuck Software
 */
abstract contract Blacklistable is WithMidasAccessControl {
    error HasRole(bytes32 role, address account);

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev checks that a given `account` doesnt
     * have BLACKLISTED_ROLE
     */
    modifier onlyNotBlacklisted(address account) {
        _onlyNotBlacklisted(account);
        _;
    }

    /**
     * @dev checks that a given `account` doesnt
     * have BLACKLISTED_ROLE
     */
    function _onlyNotBlacklisted(address account) internal view {
        require(
            !accessControl.hasRole(BLACKLISTED_ROLE, account),
            HasRole(BLACKLISTED_ROLE, account)
        );
    }
}
