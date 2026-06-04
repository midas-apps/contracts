// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";
import {IPausable} from "../interfaces/IPausable.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";

/**
 * @title MidasPauseManager
 * @notice Global manager for pausing and unpausing functions
 * @author RedDuck Software
 */
contract MidasPauseManager is WithMidasAccessControl, IMidasPauseManager {
    using AccessControlUtilsLibrary for IMidasAccessControl;

    /**
     * @dev admin role for the pause manager
     */
    bytes32 private constant _PAUSE_ADMIN_ROLE = keccak256("PAUSE_ADMIN_ROLE");

    /**
     * @notice static delay for setting pause delay
     */
    uint256 public constant DELAY_FOR_SET_DELAY = 2 days;

    /**
     * @notice pause delay
     */
    uint256 public pauseDelay;

    /**
     * @notice unpause delay
     */
    uint256 public unpauseDelay;

    /**
     * @notice global paused status
     */
    bool public globalPaused;

    /**
     * @notice contract => paused status
     */
    mapping(address => bool) public contractPaused;

    /**
     * @notice contract => function id => paused status
     */
    mapping(address => mapping(bytes4 => bool)) public contractFnPaused;

    /**
     * @dev validates that caller has access to the `contractAddr` contract admin role
     * overrides delay for the invocation with pause delay
     * @param contractAddr address of the contract
     */
    modifier onlyPausableContractAdminPause(address contractAddr) {
        _validateContractAdminAccess(contractAddr, pauseDelay);
        _;
    }

    /**
     * @dev validates that caller has access to the `contractAddr` contract admin role
     * overrides delay for the invocation with unpause delay
     * @param contractAddr address of the contract
     */
    modifier onlyPausableContractAdminUnpause(address contractAddr) {
        _validateContractAdminAccess(contractAddr, unpauseDelay);
        _;
    }

    /**
     * @dev validates that caller has access to the pause admin role
     * overrides delay for the invocation with pause delay
     */
    modifier onlyAdminPause() {
        _validateFunctionAccessWithTimelock(
            _contractAdminRole(),
            pauseDelay,
            false,
            msg.sender,
            true
        );
        _;
    }

    /**
     * @dev validates that caller has access to the unpause admin role
     * overrides delay for the invocation with unpause delay
     */
    modifier onlyAdminUnpause() {
        _validateFunctionAccessWithTimelock(
            _contractAdminRole(),
            unpauseDelay,
            false,
            msg.sender,
            true
        );
        _;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     * @param _pauseDelay pause delay
     * @param _unpauseDelay unpause delay
     */
    function initialize(
        address _accessControl,
        uint256 _pauseDelay,
        uint256 _unpauseDelay
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);
        pauseDelay = _pauseDelay;
        unpauseDelay = _unpauseDelay;
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function setPauseDelay(uint256 _pauseDelay)
        external
        onlyRoleDelayOverride(_contractAdminRole(), DELAY_FOR_SET_DELAY, true)
    {
        pauseDelay = _pauseDelay;
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function setUnpauseDelay(uint256 _unpauseDelay)
        external
        onlyRoleDelayOverride(_contractAdminRole(), DELAY_FOR_SET_DELAY, true)
    {
        unpauseDelay = _unpauseDelay;
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function globalPause() external onlyAdminPause {
        if (globalPaused) {
            return;
        }

        globalPaused = true;
        emit GlobalPauseStatusChange(true);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function globalUnpause() external onlyAdminUnpause {
        if (!globalPaused) {
            return;
        }

        globalPaused = false;
        emit GlobalPauseStatusChange(false);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function bulkPauseContract(address[] calldata contractAddrs)
        external
        onlyAdminPause
    {
        for (uint256 i = 0; i < contractAddrs.length; ++i) {
            _changeContratPauseStatus(contractAddrs[i], true);
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function bulkUnpauseContract(address[] calldata contractAddrs)
        external
        onlyAdminUnpause
    {
        for (uint256 i = 0; i < contractAddrs.length; ++i) {
            _changeContratPauseStatus(contractAddrs[i], false);
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function bulkPauseContractFn(
        address[] calldata contractAddrs,
        bytes4[] calldata selectors
    ) external onlyAdminPause {
        for (uint256 i = 0; i < contractAddrs.length; ++i) {
            address contractAddr = contractAddrs[i];

            for (uint256 j = 0; j < selectors.length; ++j) {
                bytes4 selector = selectors[j];

                if (contractFnPaused[contractAddr][selector]) {
                    continue;
                }

                contractFnPaused[contractAddr][selector] = true;
                emit FnPauseStatusChange(contractAddr, selector, true);
            }
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function bulkUnpauseContractFn(
        address[] calldata contractAddrs,
        bytes4[] calldata selectors
    ) external onlyAdminUnpause {
        for (uint256 i = 0; i < contractAddrs.length; ++i) {
            address contractAddr = contractAddrs[i];

            for (uint256 j = 0; j < selectors.length; ++j) {
                bytes4 selector = selectors[j];

                if (!contractFnPaused[contractAddr][selector]) {
                    continue;
                }

                contractFnPaused[contractAddr][selector] = false;
                emit FnPauseStatusChange(contractAddr, selector, false);
            }
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function contractAdminPause(address contractAddr)
        external
        onlyPausableContractAdminPause(contractAddr)
    {
        _changeContratPauseStatus(contractAddr, true);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function contractAdminUnpause(address contractAddr)
        external
        onlyPausableContractAdminUnpause(contractAddr)
    {
        _changeContratPauseStatus(contractAddr, false);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function isPaused(address contractAddr, bytes4 selector)
        external
        view
        returns (bool)
    {
        return
            globalPaused ||
            contractPaused[contractAddr] ||
            isFunctionPaused(contractAddr, selector);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function isFunctionPaused(address contractAddr, bytes4 selector)
        public
        view
        returns (bool)
    {
        return contractFnPaused[contractAddr][selector];
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function pauseAdminRole() public view returns (bytes32) {
        return _contractAdminRole();
    }

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function _contractAdminRole() internal pure override returns (bytes32) {
        return _PAUSE_ADMIN_ROLE;
    }

    /**
     * @dev changes the pause status of the `contractAddr` contract
     * @param contractAddr address of the contract
     * @param paused paused status
     */
    function _changeContratPauseStatus(address contractAddr, bool paused)
        private
    {
        if (contractPaused[contractAddr] == paused) {
            return;
        }

        contractPaused[contractAddr] = paused;
        emit ContractPauseStatusChange(contractAddr, paused);
    }

    /**
     * @dev validates that caller has access to the `contractAddr` contract admin role
     * @param contractAddr address of the contract
     */
    function _validateContractAdminAccess(
        address contractAddr,
        uint256 overrideDelay
    ) private view {
        (bytes32 role, bool validateFunctionRole) = _getPausableRole(
            contractAddr
        );

        _validateFunctionAccessWithTimelock(
            role,
            overrideDelay,
            false,
            msg.sender,
            validateFunctionRole
        );
    }

    /**
     * @dev gets the pauser role and validate function role for the `contractAddr` contract
     * @param contractAddr address of the contract
     * @return role pauser role
     * @return validateFunctionRole whether to validate function role
     */
    function _getPausableRole(address contractAddr)
        private
        view
        returns (bytes32, bool)
    {
        return IPausable(contractAddr).pauserRole();
    }
}
