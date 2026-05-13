// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.34;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {IPausable} from "../interfaces/IPausable.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";

/**
 * @title Pausable
 * @notice Base contract that implements basic functions and modifiers
 * with pause functionality
 * @author RedDuck Software
 */
abstract contract Pausable is WithMidasAccessControl, IPausable {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev checks that a given `fn` is not paused
     * @param fn function id
     */
    function _requireFnNotPaused(bytes4 fn) internal view {
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
    function _requireNotPaused(bytes4 fn) internal view {
        require(
            !IMidasPauseManager(accessControl.pauseManager()).isPaused(
                address(this),
                fn
            ),
            Paused(address(this), fn)
        );
    }
}
