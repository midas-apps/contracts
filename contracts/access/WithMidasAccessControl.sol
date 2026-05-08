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

    error SameBoolValue(bool value);
    error InvalidAddress(address addr);
    error HasntRole(bytes32 role, address account);

    /**
     * @notice admin role
     */
    bytes32 internal constant _DEFAULT_ADMIN_ROLE = 0x00;

    // TODO: put OZ natspec for type change
    /**
     * @notice MidasAccessControl contract address
     */
    IMidasAccessControl public accessControl;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    modifier onlyRole(bytes32 role, bool validateFunctionRole) {
        _validateFunctionAccessWithTimelock(
            role,
            false,
            msg.sender,
            validateFunctionRole
        );
        _;
    }

    modifier onlyContractAdmin() {
        _validateFunctionAccessWithTimelock(
            _contractAdminRole(),
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

    function _validateFunctionAccessWithTimelock(
        bytes32 role,
        bool roleIsFunctionOperator,
        address account,
        bool validateFunctionRole
    ) internal view virtual {
        accessControl.validateFunctionAccessWithTimelock(
            role,
            roleIsFunctionOperator,
            account,
            validateFunctionRole
        );
    }

    /**
     * @dev main admin role for the contract
     */
    function _contractAdminRole() internal view virtual returns (bytes32);
}
