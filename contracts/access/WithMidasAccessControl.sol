// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {MidasAccessControl} from "./MidasAccessControl.sol";
import {MidasAccessControlRoles} from "./MidasAccessControlRoles.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";

/**
 * @title WithMidasAccessControl
 * @notice Base contract that consumes MidasAccessControl
 * @author RedDuck Software
 */
abstract contract WithMidasAccessControl is
    MidasInitializable,
    MidasAccessControlRoles
{
    error InvalidAddress(address addr);
    error HasRole(bytes32 role, address account);
    error HasntRole(bytes32 role, address account);
    error NoFunctionPermission(
        bytes32 functionAccessAdminRole,
        bytes4 functionSelector,
        address account
    );

    /**
     * @notice admin role
     */
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /**
     * @notice MidasAccessControl contract address
     */
    MidasAccessControl public accessControl;

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
        accessControl = MidasAccessControl(_accessControl);
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

    /**
     * @dev checks that given `account` has function permission for the given function selector
     * @param functionAccessAdminRole OZ role for the scope
     * @param functionSelector function selector
     * @param account address checked for permission
     */
    function _hasFunctionPermission(
        bytes32 functionAccessAdminRole,
        bytes4 functionSelector,
        address account
    ) internal view {
        require(
            accessControl.hasFunctionPermission(
                functionAccessAdminRole,
                address(this),
                functionSelector,
                account
            ),
            NoFunctionPermission(
                functionAccessAdminRole,
                functionSelector,
                account
            )
        );
    }
}
