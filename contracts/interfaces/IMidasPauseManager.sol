// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title IMidasPauseManager
 * @notice Interface for the MidasPauseManager
 * @author RedDuck Software
 */
interface IMidasPauseManager {
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

    /**
     * @notice pauses a speific contract
     * @dev can be called only by the admin of `contractAddr`
     * @param contractAddr contract address
     */
    function pauseContract(address contractAddr) external;

    /**
     * @notice unpauses a speific contract
     * @dev can be called only by the admin of `contractAddr`
     * @param contractAddr contract address
     */
    function unpauseContract(address contractAddr) external;

    /**
     * @notice pauses functions of a contract
     * @dev can be called only by the admin of `contractAddr`
     * @param contractAddr contract address
     * @param selectors function ids
     */
    function bulkPauseContractFn(
        address contractAddr,
        bytes4[] calldata selectors
    ) external;

    /**
     * @notice unpauses functions of a contract
     * @dev can be called only by the admin of `contractAddr`
     * @param contractAddr contract address
     * @param selectors function ids
     */
    function bulkUnpauseContractFn(
        address contractAddr,
        bytes4[] calldata selectors
    ) external;

    /**
     * @notice pauses the protocol
     * @dev can be called only by the admin of the pause manager
     */
    function globalPause() external;

    /**
     * @notice unpauses the protocol
     * @dev can be called only by the admin of the pause manager
     */
    function globalUnpause() external;

    /**
     * @notice checks if function of a contract is paused
     * @param contractAddr contract address
     * @param selector function id
     * @return paused true if the function is paused
     */
    function isFunctionPaused(address contractAddr, bytes4 selector)
        external
        view
        returns (bool);

    /**
     * @notice checks if function or contract or protocol is paused
     * @param contractAddr contract address
     * @return paused true if paused
     */
    function isPaused(address contractAddr, bytes4 selector)
        external
        view
        returns (bool);

    /**
     * @notice returns the admin role for the pause manager
     * @return role admin role
     */
    function pauseAdminRole() external view returns (bytes32);
}
