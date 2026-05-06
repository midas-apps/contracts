// SPDX-License-Identifier: UNLICENSEDI
pragma solidity 0.8.34;

import "../access/Pausable.sol";
import {MidasAccessControl} from "../access/MidasAccessControl.sol";

contract PausableTester is Pausable {
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function _validatePauseAdminAccess(address account) internal view override {
        _validateFunctionAccessWithTimelock(pauseAdminRole(), account);
    }

    function pauseAdminRole() public view returns (bytes32) {
        return MidasAccessControl(address(accessControl)).DEFAULT_ADMIN_ROLE();
    }

    function _disableInitializers() internal override {}
}
