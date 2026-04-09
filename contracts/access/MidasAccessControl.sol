// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

import {MidasAccessControlRoles} from "./MidasAccessControlRoles.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";

/**
 * @title MidasAccessControl
 * @notice Smart contract that stores all roles for Midas project
 * @author RedDuck Software
 */
contract MidasAccessControl is
    IMidasAccessControl,
    AccessControlUpgradeable,
    MidasInitializable,
    MidasAccessControlRoles
{
    /**
     * @dev Only when true may holders of `functionAccessAdminRole` manage grant operators for that role's scopes.
     */
    mapping(bytes32 => bool) public functionAccessAdminRoleEnabled;

    /// @dev Grant operators may call `setFunctionPermission` for the corresponding permission key.
    mapping(bytes32 => mapping(address => bool))
        private _functionAccessGrantOperators;

    /// @dev Accounts allowed to call the scoped function on `targetContract`.
    mapping(bytes32 => mapping(address => bool)) private _functionPermissions;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     */
    function initialize() external initializer {
        __AccessControl_init();
        _setupRoles(msg.sender);
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessAdminRoleEnabled(
        bytes32 functionAccessAdminRole,
        bool enabled
    ) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        functionAccessAdminRoleEnabled[functionAccessAdminRole] = enabled;
        emit FunctionAccessAdminRoleEnabled(functionAccessAdminRole, enabled);
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessGrantOperator(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address operator,
        bool enabled
    ) external {
        require(
            functionAccessAdminRoleEnabled[functionAccessAdminRole],
            "MAC: FA admin role disabled"
        );
        _checkRole(functionAccessAdminRole, _msgSender());
        bytes32 key = _functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        _functionAccessGrantOperators[key][operator] = enabled;
        emit FunctionAccessGrantOperatorUpdated(
            functionAccessAdminRole,
            targetContract,
            functionSelector,
            operator,
            enabled
        );
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionPermission(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address account,
        bool enabled
    ) external {
        bytes32 key = _functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        require(
            _functionAccessGrantOperators[key][_msgSender()],
            "MAC: not FA grant operator"
        );
        _functionPermissions[key][account] = enabled;
        emit FunctionPermissionUpdated(
            functionAccessAdminRole,
            targetContract,
            account,
            functionSelector,
            enabled
        );
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function isFunctionAccessGrantOperator(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address operator
    ) external view returns (bool) {
        bytes32 key = _functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        return _functionAccessGrantOperators[key][operator];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function hasFunctionPermission(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address account
    ) external view returns (bool) {
        bytes32 key = _functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        return _functionPermissions[key][account];
    }

    /**
     * @notice grant multiple roles to multiple users
     * in one transaction
     * @dev length`s of 2 arays should match
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function grantRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");

        for (uint256 i = 0; i < roles.length; i++) {
            _checkRole(getRoleAdmin(roles[i]), msg.sender);
            _grantRole(roles[i], addresses[i]);
        }
    }

    /**
     * @notice revoke multiple roles from multiple users
     * in one transaction
     * @dev length`s of 2 arays should match
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function revokeRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");
        for (uint256 i = 0; i < roles.length; i++) {
            _checkRole(getRoleAdmin(roles[i]), msg.sender);
            _revokeRole(roles[i], addresses[i]);
        }
    }

    /**
     * @notice set the admin role for a specific role
     * @dev can be called only by the address that holds current admin role
     * @param role the role to set the admin role for
     * @param newAdminRole the new admin role
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external {
        _checkRole(getRoleAdmin(role), msg.sender);
        _setRoleAdmin(role, newAdminRole);
    }

    //solhint-disable disable-next-line
    function renounceRole(bytes32, address)
        public
        pure
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        revert("MAC: Forbidden");
    }

    /**
     * @dev setup roles during the contracts initialization
     */
    function _setupRoles(address admin) private {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        _setRoleAdmin(BLACKLISTED_ROLE, BLACKLIST_OPERATOR_ROLE);
        _setRoleAdmin(GREENLISTED_ROLE, GREENLIST_OPERATOR_ROLE);
    }

    /**
     * @dev calculates the base key for function permission mappings
     * @param functionAccessAdminRole OZ role
     * @param targetContract scoped contract
     * @param functionSelector scoped function of a `targetContract`
     * @return key the base key for function permission mappings
     */
    function _functionPermissionKey(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    functionAccessAdminRole,
                    targetContract,
                    functionSelector
                )
            );
    }
}
