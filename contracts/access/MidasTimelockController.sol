// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title MidasTimelockController
 * @notice Default TimelockController but with getters for proposers and executors
 * @author RedDuck Software
 */
contract MidasTimelockController is TimelockController {
    /**
     * @dev initial proposers array
     */
    address[] private _initialProposers;

    /**
     * @dev initial executors array
     */
    address[] private _initialExecutors;

    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) TimelockController(minDelay, proposers, executors, address(0)) {
        _initialProposers = proposers;
        _initialExecutors = executors;
    }

    /**
     * @notice Get all the initial proposers
     * @return initial proposers addresses
     */
    function getInitialProposers() external view returns (address[] memory) {
        return _initialProposers;
    }

    /**
     * @notice Get all the initial executors
     * @return initial executors addresses
     */
    function getInitialExecutors() external view returns (address[] memory) {
        return _initialExecutors;
    }
}
