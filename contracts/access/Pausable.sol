// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.34;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";

/**
 * @title Pausable
 * @notice Base contract that implements basic functions and modifiers
 * with pause functionality
 * @author RedDuck Software
 */
abstract contract Pausable is WithMidasAccessControl, PausableUpgradeable {
    error SameBytes4Value(bytes4 value);
    error FnPaused(bytes4 fn);

    /**
     * @notice function id => paused status
     */
    mapping(bytes4 => bool) public fnPaused;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @param caller caller address (msg.sender)
     * @param fn function id
     */
    event PauseFnStatusChange(
        address indexed caller,
        bytes4 indexed fn,
        bool isPaused
    );

    /**
     * @dev checks that a given `account` has access to pause functions
     */
    modifier onlyPauseAdmin() {
        _validatePauseAdminAccess(msg.sender);
        _;
    }

    function pause() external onlyPauseAdmin {
        _pause();
    }

    function unpause() external onlyPauseAdmin {
        _unpause();
    }

    /**
     * @notice pause specific functions
     * @param fns function ids to pause
     */
    function bulkPauseFn(bytes4[] calldata fns) external onlyPauseAdmin {
        for (uint256 i = 0; i < fns.length; ++i) {
            bytes4 fn = fns[i];
            require(!fnPaused[fn], SameBytes4Value(fn));
            fnPaused[fn] = true;
            emit PauseFnStatusChange(msg.sender, fn, true);
        }
    }

    /**
     * @notice unpause specific functions
     * @param fns function ids to unpause
     */
    function bulkUnpauseFn(bytes4[] calldata fns) external onlyPauseAdmin {
        for (uint256 i = 0; i < fns.length; ++i) {
            bytes4 fn = fns[i];
            require(fnPaused[fn], SameBytes4Value(fn));
            fnPaused[fn] = false;
            emit PauseFnStatusChange(msg.sender, fn, false);
        }
    }

    /**
     * @dev validates that the caller has access to pause functions
     * @param account account address
     */
    function _validatePauseAdminAccess(address account) internal view virtual;

    /**
     * @dev checks that a given `fn` is not paused
     * @param fn function id
     * @param validateGlobalPause if true, validates if global pause is not paused
     */
    function _requireFnNotPaused(bytes4 fn, bool validateGlobalPause)
        internal
        view
    {
        if (validateGlobalPause) {
            _requireNotPaused();
        }

        require(!fnPaused[fn], FnPaused(fn));
    }
}
