// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {WithMidasAccessControl} from "./WithMidasAccessControl.sol";
import {IPausable} from "../interfaces/IPausable.sol";
import {IMidasPauseManager} from "../interfaces/IMidasPauseManager.sol";

/**
 * @title MidasPauseManager
 * @notice Global manager for pausing and unpausing functions
 * @author RedDuck Software
 */
contract MidasPauseManager is WithMidasAccessControl, IMidasPauseManager {
    /**
     * @dev admin role for the pause manager
     */
    bytes32 private constant _PAUSE_ADMIN_ROLE = keccak256("PAUSE_ADMIN_ROLE");

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
        emit ContractPauseStatusChange(contractAddr, true);
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
        emit ContractPauseStatusChange(contractAddr, false);
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
            emit FnPauseStatusChange(contractAddr, selector, true);
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
            emit FnPauseStatusChange(contractAddr, selector, false);
        }
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function globalPause() external onlyContractAdmin {
        require(!globalPaused, SameBoolValue(true));
        globalPaused = true;
        emit GlobalPauseStatusChange(true);
    }

    /**
     * @inheritdoc IMidasPauseManager
     */
    function globalUnpause() external onlyContractAdmin {
        require(globalPaused, SameBoolValue(false));
        globalPaused = false;
        emit GlobalPauseStatusChange(false);
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
