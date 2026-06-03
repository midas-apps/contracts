// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {MidasAccessControlRoles} from "./MidasAccessControlRoles.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";

/**
 * @title WithMidasAccessControl
 * @notice Base contract that consumes MidasAccessControl
 * @author RedDuck Software
 */
abstract contract WithMidasAccessControl is
    MidasInitializable,
    MidasAccessControlRoles
{
    using AccessControlUtilsLibrary for IMidasAccessControl;

    /**
     * @notice error when the value is the same as the previous value
     * @param value value
     */
    error SameBoolValue(bool value);

    /**
     * @notice error when the account does not have the role
     * @param role role
     * @param account account
     */
    error HasntRole(bytes32 role, address account);

    /**
     * @notice admin role
     */
    bytes32 internal constant _DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @notice MidasAccessControl contract address
     * @custom:oz-retyped-from MidasAccessControl
     */
    IMidasAccessControl public accessControl;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev validates that the caller has the function role with timelock
     * @param role base role to validate
     * @param validateFunctionRole whether to validate the function role
     */
    modifier onlyRole(bytes32 role, bool validateFunctionRole) {
        _validateFunctionAccessWithTimelock(
            role,
            AccessControlUtilsLibrary.NULL_DELAY,
            false,
            msg.sender,
            validateFunctionRole
        );
        _;
    }

    /**
     * @dev validates that the caller has the function role without timelock
     * @param role base role to validate
     */
    modifier onlyRoleNoTimelock(bytes32 role, bool validateFunctionRole) {
        _validateFunctionAccessWithoutTimelock(
            role,
            false,
            msg.sender,
            validateFunctionRole
        );
        _;
    }

    /**
     * @dev validates that the caller has the contract admin role or function operator role
     */
    modifier onlyContractAdmin() {
        _validateFunctionAccessWithTimelock(
            _contractAdminRole(),
            AccessControlUtilsLibrary.NULL_DELAY,
            false,
            msg.sender,
            true
        );
        _;
    }

    /**
     * @dev upgradeable pattern contract`s initializer
     */
    // solhint-disable func-name-mixedcase
    function __WithMidasAccessControl_init(address _accessControl)
        internal
        onlyInitializing
    {
        require(_accessControl != address(0), InvalidAddress(_accessControl));
        accessControl = IMidasAccessControl(_accessControl);
    }

    /**
     * @dev validates that the function access is valid with timelock
     * @param role base role to validate
     * @param overrideDelay override delay for the invocation
     * @param roleIsFunctionOperator whether the role is a function operator
     * @param account account to validate
     * @param validateFunctionRole whether to validate the function role
     */
    function _validateFunctionAccessWithTimelock(
        bytes32 role,
        uint256 overrideDelay,
        bool roleIsFunctionOperator,
        address account,
        bool validateFunctionRole
    ) internal view virtual {
        accessControl.validateFunctionAccessWithTimelock(
            role,
            overrideDelay,
            roleIsFunctionOperator,
            account,
            validateFunctionRole
        );
    }

    /**
     * @dev validates that the function access is valid without timelock
     * @param role base role to validate
     * @param roleIsFunctionOperator whether the role is a function operator
     * @param account account to validate
     * @param validateFunctionRole whether to validate the function role
     */
    function _validateFunctionAccessWithoutTimelock(
        bytes32 role,
        bool roleIsFunctionOperator,
        address account,
        bool validateFunctionRole
    ) internal view {
        accessControl.validateFunctionAccess(
            AccessControlUtilsLibrary.getTimlockManager(accessControl),
            role,
            AccessControlUtilsLibrary.NO_DELAY,
            roleIsFunctionOperator,
            account,
            msg.sig,
            validateFunctionRole
        );
    }

    /**
     * @dev main admin role for the contract
     */
    function _contractAdminRole() internal view virtual returns (bytes32);
}
