// SPDX-License-Identifier: UNLICENSEDI
pragma solidity 0.8.34;

import "../access/Pausable.sol";
import {MidasAccessControl} from "../access/MidasAccessControl.sol";

contract PausableTester is Pausable {
    bytes32 private _contractAdminRoleOverride;

    function setContractAdminRole(bytes32 role) external {
        _contractAdminRoleOverride = role;
    }

    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function requireFnNotPaused(bytes4 fn) external {
        _requireFnNotPaused(fn);
    }

    function requireNotPaused(bytes4 fn) external {
        _requireNotPaused(fn);
    }

    /**
     * @inheritdoc IPausable
     */
    function pauserRole()
        external
        view
        virtual
        override
        returns (bytes32, bool)
    {
        return (_contractAdminRole(), true);
    }

    function _contractAdminRole() internal view override returns (bytes32) {
        return _contractAdminRoleOverride;
    }

    function _disableInitializers() internal override {}
}
