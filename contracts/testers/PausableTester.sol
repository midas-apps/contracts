// SPDX-License-Identifier: UNLICENSEDI
pragma solidity 0.8.34;

import {IMidasAccessControlManaged} from "../interfaces/IMidasAccessControlManaged.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {PauseUtilsLibrary} from "../libraries/PauseUtilsLibrary.sol";

contract PausableTester is WithMidasAccessControl {
    bytes32 private _contractAdminRoleOverride;

    function setContractAdminRole(bytes32 role) external {
        _contractAdminRoleOverride = role;
    }

    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function requireFnNotPaused(bytes4 fn) external {
        PauseUtilsLibrary.requireFnNotPaused(accessControl, fn);
    }

    function requireNotPaused(bytes4 fn) external {
        PauseUtilsLibrary.requireNotPaused(accessControl, fn);
    }

    function contractAdminRole() public view override returns (bytes32) {
        return _contractAdminRoleOverride;
    }

    function _disableInitializers() internal override {}
}
