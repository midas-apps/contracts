// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MidasAccessControl.sol";

abstract contract WithMidasAccessControl is
    Initializable,
    MidasAccessControlRoles
{
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    MidasAccessControl public accessControl;

    modifier onlyRole(bytes32 role, address account) {
        _onlyRole(role, account);
        _;
    }

    modifier onlyNotRole(bytes32 role, address account) {
        _onlyNotRole(role, account);
        _;
    }

    function __WithMidasAccessControl_init(
        address _accessControl
    ) internal onlyInitializing {
        accessControl = MidasAccessControl(_accessControl);
    }

    function grantRole(bytes32 role, address account) internal {
        accessControl.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) internal {
        accessControl.revokeRole(role, account);
    }

    function _onlyRole(bytes32 role, address account) internal view {
        require(accessControl.hasRole(role, account), "WMAC: hasnt role");
    }

    function _onlyNotRole(bytes32 role, address account) internal view {
        require(!accessControl.hasRole(role, account), "WMAC: has role");
    }
}
