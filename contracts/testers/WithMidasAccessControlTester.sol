// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/WithMidasAccessControl.sol";

contract WithMidasAccessControlTester is WithMidasAccessControl {
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function initializeWithoutInitializer(address _accessControl) external {
        __WithMidasAccessControl_init(_accessControl);
    }

    function grantRoleTester(bytes32 role, address account) external {
        accessControl.grantRole(role, account);
    }

    function revokeRoleTester(bytes32 role, address account) external {
        accessControl.revokeRole(role, account);
    }

    function withOnlyRole(bytes32 role, address account)
        external
        onlyRole(role, account)
    {}

    function withOnlyNotRole(bytes32 role, address account)
        external
        onlyNotRole(role, account)
    {}

    function _disableInitializers() internal override {}
}
