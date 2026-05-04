// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/Greenlistable.sol";

contract GreenlistableTester is Greenlistable {
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function onlyGreenlistedTester(address account)
        external
        onlyGreenlisted(account)
    {}

    function validateGreenlistableAdminAccess(address account) external view {
        _validateGreenlistableAdminAccess(account);
    }

    function _disableInitializers() internal override {}

    function _validateGreenlistableAdminAccess(address account)
        internal
        view
        override
    {
        if (accessControl.hasRole(greenlistAdminRole(), account)) return;
        _hasFunctionPermission(greenlistAdminRole(), msg.sig, account);
    }

    function greenlistAdminRole() public view virtual returns (bytes32) {
        return keccak256("GREENLIST_ADMIN_ROLE");
    }
}
