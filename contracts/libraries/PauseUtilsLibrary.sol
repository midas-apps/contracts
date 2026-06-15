// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";

/**
 * @title PauseUtilsLibrary
 * @notice library for checking pause statuses
 * @author RedDuck Software
 */
library PauseUtilsLibrary {
    /**
     * @notice error thrown when a function is paused
     * @param contractAddr contract address
     * @param fn function id
     */
    error Paused(address contractAddr, bytes4 fn);

    /**
     * @dev checks that a given `fn` is not paused
     * @param fn function id
     */
    function requireFnNotPaused(IMidasAccessControl accessControl, bytes4 fn)
        internal
        view
    {
        require(
            !IMidasPauseManager(accessControl.pauseManager()).isFunctionPaused(
                address(this),
                fn
            ),
            Paused(address(this), fn)
        );
    }

    /**
     * @dev checks that a given `fn` and contract/global are not paused
     * @param fn function id
     */
    function requireNotPaused(IMidasAccessControl accessControl, bytes4 fn)
        internal
        view
    {
        require(
            !IMidasPauseManager(accessControl.pauseManager()).isPaused(
                address(this),
                fn
            ),
            Paused(address(this), fn)
        );
    }
}
