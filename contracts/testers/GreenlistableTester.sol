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

    function _disableInitializers() internal override {}

    function greenlistAdminRole() public view virtual returns (bytes32) {
        return keccak256("GREENLIST_ADMIN_ROLE");
    }

    function _contractAdminRole() internal pure override returns (bytes32) {
        return _DEFAULT_ADMIN_ROLE;
    }
}
