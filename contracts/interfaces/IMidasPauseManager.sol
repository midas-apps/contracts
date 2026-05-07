// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title IMidasPauseManager
 * @notice Interface for the MidasPauseManager
 * @author RedDuck Software
 */
interface IMidasPauseManager {
    error SameBytes4Value(bytes4 value);

    /**
     * @param caller caller address (msg.sender)
     * @param contractAddr contract address
     * @param fn function id
     * @param isPaused paused status
     */
    event PauseFnStatusChange(
        address indexed caller,
        address indexed contractAddr,
        bytes4 indexed fn,
        bool isPaused
    );

    function pauseContract(address contractAddr) external;

    function unpauseContract(address contractAddr) external;

    function bulkPauseContractFn(
        address contractAddr,
        bytes4[] calldata selectors
    ) external;

    function bulkUnpauseContractFn(
        address contractAddr,
        bytes4[] calldata selectors
    ) external;

    function globalPause() external;

    function globalUnpause() external;

    function isPaused(address contractAddr, bytes4 selector)
        external
        view
        returns (bool);

    function pauseAdminRole() external view returns (bytes32);
}
