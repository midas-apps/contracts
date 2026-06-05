// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/WithMidasAccessControl.sol";

contract WithMidasAccessControlTester is WithMidasAccessControl {
    bytes32 private _contractAdminRoleOverride;

    function setContractAdminRole(bytes32 role) external {
        _contractAdminRoleOverride = role;
    }

    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function initializeWithoutInitializer(address _accessControl) external {
        __WithMidasAccessControl_init(_accessControl);
    }

    function withOnlyRole(bytes32 role, bool validateFunctionRole)
        external
        onlyRole(role, validateFunctionRole)
    {}

    function withOnlyRoleNoTimelock(bytes32 role, bool validateFunctionRole)
        external
        onlyRoleNoTimelock(role, validateFunctionRole)
    {}

    function withOnlyContractAdmin() external onlyContractAdmin {}

    function contractAdminRole() public view override returns (bytes32) {
        return _contractAdminRoleOverride;
    }

    function _disableInitializers() internal override {}
}
