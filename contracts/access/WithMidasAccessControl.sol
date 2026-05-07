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
    error HasRole(bytes32 role, address account);
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

    /**
     * @dev checks that given `address` have `role`
     */
    modifier onlyRole(bytes32 role, address account) {
        _onlyRole(role, account);
        _;
    }

    /**
     * @dev checks that given `address` do not have `role`
     */
    modifier onlyNotRole(bytes32 role, address account) {
        _onlyNotRole(role, account);
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
     * @dev checks that given `address` have `role`
     */
    function _onlyRole(bytes32 role, address account) internal view {
        require(accessControl.hasRole(role, account), HasntRole(role, account));
    }

    /**
     * @dev checks that given `address` do not have `role`
     */
    function _onlyNotRole(bytes32 role, address account) internal view {
        require(!accessControl.hasRole(role, account), HasRole(role, account));
    }

    function _validateFunctionAccessWithTimelock(
        bytes32 role,
        address account,
        bool validateFunctionRole
    ) internal view {
        accessControl.validateFunctionAccessWithTimelock(
            role,
            account,
            validateFunctionRole
        );
    }
}
