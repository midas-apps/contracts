// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";

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

    event SetGreenlistEnable(address indexed sender, bool enable);

    /**
     * @dev checks that a given `account`
     * have `greenlistedRole()`
     */
    modifier onlyGreenlisted(address account) {
        if (greenlistEnabled) _onlyGreenlisted(account);
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     * @param _accessControl MidasAccessControl contract address
     */
    // solhint-disable func-name-mixedcase
    function __Greenlistable_init(address _accessControl)
        internal
        onlyInitializing
    {
        __WithMidasAccessControl_init(_accessControl);
        __Greenlistable_init_unchained();
    }

    /**
     * @dev upgradeable pattern contract`s initializer unchained
     */
    // solhint-disable func-name-mixedcase
    function __Greenlistable_init_unchained() internal onlyInitializing {}

    /**
     * @notice enable or disable greenlist.
     * can be called only from permissioned actor.
     * @param enable enable
     */
    function setGreenlistEnable(bool enable) external {
        _validateGreenlistableAdminAccess(msg.sender);
        require(greenlistEnabled != enable, "GL: same enable status");
        greenlistEnabled = enable;
        emit SetGreenlistEnable(msg.sender, enable);
    }

    /**
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function greenlistedRole() public view virtual returns (bytes32) {
        return GREENLISTED_ROLE;
    }

    /**
     * @dev checks that a given `account`
     * have a `greenlistedRole()`
     */
    function _onlyGreenlisted(address account)
        private
        view
        onlyRole(greenlistedRole(), account)
    {}

    /**
     * @dev checks that a given `account` has access to greenlistable functions
     */
    function _validateGreenlistableAdminAccess(address account)
        internal
        view
        virtual;
}
