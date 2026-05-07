// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title IMidasTimelockManager
 * @notice Interface for the MidasTimelockManager
 * @author RedDuck Software
 */
interface IMidasTimelockManager {
    error RolePreflightSucceeded(bytes32 role);

    /**
     * @notice Whether the function is ready to execute
     * @param targetRole the role of the target
     * @param target the target address
     * @param data the data to execute the function
     * @param originalCaller the original caller of the function
     * @return ready whether the function can be executed
     * @return timelocked whether the function will be called via timelock
     */
    function isFunctionReadyToExecute(
        bytes32 targetRole,
        address target,
        bytes calldata data,
        address originalCaller
    ) external view returns (bool ready, bool timelocked);

    /**
     * @notice address of the timelock manager
     * @return timelockManager address of the timelock manager
     */
    function timelock() external view returns (address);
}
