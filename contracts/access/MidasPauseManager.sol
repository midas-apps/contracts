// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";
import {IPausable} from "../interfaces/IPausable.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";

/**
 * @title MidasPauseManager
 * @notice Global manager for pausing and unpausing functions
 * @author RedDuck Software
 */
contract MidasPauseManager is
    WithMidasAccessControl,
    PausableUpgradeable,
    IMidasPauseManager
{
    /**
     * @dev admin role for the pause manager
     */
    bytes32 private constant _PAUSE_ADMIN_ROLE = keccak256("PAUSE_ADMIN_ROLE");

    /**
     * @notice contract => function id => paused status
     */
    mapping(address => mapping(bytes4 => bool)) public contractFnPaused;

    /**
     * @notice contract => paused status
     */
    mapping(address => bool) public contractPaused;

    /**
     * @dev validates that caller has access to the `contractAddr` contract admin role
     * @param contractAddr address of the contract
     */
    modifier onlyPausableContractAdmin(address contractAddr) {
        _validateContractAdminAccess(contractAddr);
        _;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     */
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
        __Pausable_init_unchained();
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function pauseContract(address contractAddr)
        external
        onlyPausableContractAdmin(contractAddr)
    {
        require(!contractPaused[contractAddr], SameBoolValue(true));
        contractPaused[contractAddr] = true;
        emit PauseFnStatusChange(msg.sender, contractAddr, msg.sig, true);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function unpauseContract(address contractAddr)
        external
        onlyPausableContractAdmin(contractAddr)
    {
        require(contractPaused[contractAddr], SameBoolValue(false));
        contractPaused[contractAddr] = false;
        emit PauseFnStatusChange(msg.sender, contractAddr, msg.sig, false);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function bulkPauseContractFn(
        address contractAddr,
        bytes4[] calldata selectors
    ) external onlyPausableContractAdmin(contractAddr) {
        for (uint256 i = 0; i < selectors.length; ++i) {
            bytes4 selector = selectors[i];
            require(
                !contractFnPaused[contractAddr][selector],
                SameBoolValue(true)
            );

            contractFnPaused[contractAddr][selector] = true;
            emit PauseFnStatusChange(msg.sender, contractAddr, selector, true);
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function bulkUnpauseContractFn(
        address contractAddr,
        bytes4[] calldata selectors
    ) external onlyPausableContractAdmin(contractAddr) {
        for (uint256 i = 0; i < selectors.length; ++i) {
            bytes4 selector = selectors[i];
            require(
                contractFnPaused[contractAddr][selector],
                SameBoolValue(false)
            );
            contractFnPaused[contractAddr][selector] = false;
            emit PauseFnStatusChange(msg.sender, contractAddr, selector, false);
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function globalPause() external onlyContractAdmin {
        _pause();
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function globalUnpause() external onlyContractAdmin {
        _unpause();
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
            paused() ||
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
     * @dev validates that caller has access to the `contractAddr` contract admin role
     * @param contractAddr address of the contract
     */
    function _validateContractAdminAccess(address contractAddr) internal view {
        (bytes32 role, bool validateFunctionRole) = IPausable(contractAddr)
            .pauserRole();
        require(
            !accessControl.isUserFacingRole(role),
            UserFacingRoleNotAllowed(role)
        );
        _validateFunctionAccessWithTimelock(
            role,
            false,
            msg.sender,
            validateFunctionRole
        );
    }
}
