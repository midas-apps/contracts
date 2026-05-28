// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title IPausable
 * @notice Interface for pausable contracts
 * @author RedDuck Software
 */
interface IPausable {
    /**
     * @notice error thrown when a function is paused
     * @param contractAddr contract address
     * @param fn function id
     */
    error Paused(address contractAddr, bytes4 fn);

    /**
     * @notice returns pauser role
     * @return role role descriptor
     * @return validateFunctionRole whether to validate function role
     */
    function pauserRole()
        external
        view
        returns (
            bytes32, /* role */
            bool /* validateFunctionRole */
        );
}
