// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title IMidasPauseManager
 * @notice Interface for the MidasPauseManager
 * @author RedDuck Software
 */
interface IMidasPauseManager {
    /**
     * @param contractAddr contract address
     * @param fn function id
     * @param isPaused paused status
     */
    event FnPauseStatusChange(
        address indexed contractAddr,
        bytes4 indexed fn,
        bool isPaused
    );

    /**
     * @param contractAddr contract address
     * @param isPaused paused status
     */
    event ContractPauseStatusChange(
        address indexed contractAddr,
        bool isPaused
    );

    /**
     * @param isPaused paused status
     */
    event GlobalPauseStatusChange(bool isPaused);

    /**
     * @param pauseDelay pause delay
     */
    event SetPauseDelay(uint32 pauseDelay);

    /**
     * @param unpauseDelay unpause delay
     */
    event SetUnpauseDelay(uint32 unpauseDelay);

    /**
     * @notice sets the pause delay
     * @dev can be called only by the pause manager admin or function admin
     * @param _pauseDelay pause delay
     */
    function setPauseDelay(uint32 _pauseDelay) external;

    /**
     * @notice sets the unpause delay
     * @dev can be called only by the pause manager admin or function admin
     * @param _unpauseDelay unpause delay
     */
    function setUnpauseDelay(uint32 _unpauseDelay) external;

    /**
     * @notice pauses the protocol
     * @dev can be called only by the pause manager admin
     */
    function globalPause() external;

    /**
     * @notice unpauses the protocol
     * @dev can be called only by the pause manager admin
     */
    function globalUnpause() external;

    /**
     * @notice pauses an array of contracts
     * @dev can be called only by the pause manager admin or function admin
     * @param contractAddrs array of contract addresses
     */
    function bulkPauseContract(address[] calldata contractAddrs) external;

    /**
     * @notice unpauses an array of contracts
     * @dev can be called only by the pause manager admin or function admin
     * @param contractAddrs array of contract addresses
     */
    function bulkUnpauseContract(address[] calldata contractAddrs) external;

    /**
     * @notice pauses functions on an array of contracts
     * @dev can be called only by the pause manager admin or function admin
     * @param contractAddrs array of contract addresses
     * @param selectors function ids to pause on the contracts
     */
    function bulkPauseContractFn(
        address[] calldata contractAddrs,
        bytes4[] calldata selectors
    ) external;

    /**
     * @notice unpauses functions on an array of contracts
     * @dev can be called only by the pause manager admin or function admin
     * @param contractAddrs array of contract addresses
     * @param selectors function ids to unpause on the contracts
     */
    function bulkUnpauseContractFn(
        address[] calldata contractAddrs,
        bytes4[] calldata selectors
    ) external;

    /**
     * @notice pauses a contract
     * @dev can be called only by admin of a contract or function admin that
     * is managed by the admin of the contract
     * @param contractAddr address of the contract
     */
    function contractAdminPause(address contractAddr) external;

    /**
     * @notice unpauses a contract
     * @dev can be called only by admin of a contract or function admin that
     * is managed by the admin of the contract
     * @param contractAddr address of the contract
     */
    function contractAdminUnpause(address contractAddr) external;

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

    /**
     * @notice returns the pause delay
     * @return pause delay
     */
    function pauseDelay() external view returns (uint32);

    /**
     * @notice returns the unpause delay
     * @return unpause delay
     */
    function unpauseDelay() external view returns (uint32);
}
