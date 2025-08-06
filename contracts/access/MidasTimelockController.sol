// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title MidasTimelockController
 * @notice Default TimelockController but with getters for proposers and executors
 * @author RedDuck Software
 */
contract MidasTimelockController is TimelockController {
    address[] private _proposers;
    address[] private _executors;

    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) TimelockController(minDelay, proposers, executors, address(0)) {
        _proposers = proposers;
        _executors = executors;

        _revokeRole(TIMELOCK_ADMIN_ROLE, address(this));
    }

    /**
     * @notice Get all the proposers
     * @return proposers addresses
     */
    function getProposers() external view returns (address[] memory) {
        return _proposers;
    }

    /**
     * @notice Get all the executors
     * @return executors addresses
     */
    function getExecutors() external view returns (address[] memory) {
        return _executors;
    }
}
