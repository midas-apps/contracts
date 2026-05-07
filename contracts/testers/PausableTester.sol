// SPDX-License-Identifier: UNLICENSEDI
pragma solidity 0.8.34;

import "../access/Pausable.sol";
import {MidasAccessControl} from "../access/MidasAccessControl.sol";

contract PausableTester is Pausable {
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function requireFnNotPaused(bytes4 fn) external {
        _requireFnNotPaused(fn);
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
        return (_DEFAULT_ADMIN_ROLE, true);
    }

    function _disableInitializers() internal override {}
}
