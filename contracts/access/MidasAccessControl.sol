// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

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
        _setupRoles(_msgSender());
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessAdminRoleEnabledMult(
        SetFunctionAccessAdminRoleEnabledParams[] calldata params
    ) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionAccessAdminRoleEnabledParams memory param = params[i];

            // if already enabled, skip and do not emit event
            if (functionAccessAdminRoleEnabled[param.functionAccessAdminRole]) {
                continue;
            }

            functionAccessAdminRoleEnabled[
                param.functionAccessAdminRole
            ] = param.enabled;
            emit FunctionAccessAdminRoleEnable(
                param.functionAccessAdminRole,
                param.enabled
            );
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessGrantOperatorMult(
        SetFunctionAccessGrantOperatorParams[] calldata params
    ) external {
        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionAccessGrantOperatorParams memory param = params[i];
            require(
                functionAccessAdminRoleEnabled[param.functionAccessAdminRole],
                "MAC: FA admin role disabled"
            );
            _checkRole(param.functionAccessAdminRole, _msgSender());
            bytes32 key = _functionPermissionKey(
                param.functionAccessAdminRole,
                param.targetContract,
                param.functionSelector
            );

            // if already enabled, skip and do not emit event
            if (_functionAccessGrantOperators[key][param.operator]) {
                continue;
            }

            _functionAccessGrantOperators[key][param.operator] = param.enabled;
            emit FunctionAccessGrantOperatorUpdate(
                param.functionAccessAdminRole,
                param.targetContract,
                param.operator,
                param.functionSelector,
                param.enabled
            );
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionPermissionMult(
        SetFunctionPermissionParams[] calldata params
    ) external {
        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionPermissionParams memory param = params[i];
            bytes32 key = _functionPermissionKey(
                param.functionAccessAdminRole,
                param.targetContract,
                param.functionSelector
            );
            require(
                _functionAccessGrantOperators[key][_msgSender()],
                "MAC: not FA grant operator"
            );

            // if already enabled, skip and do not emit event
            if (_functionPermissions[key][param.account]) {
                continue;
            }

            _functionPermissions[key][param.account] = param.enabled;
            emit FunctionPermissionUpdate(
                param.functionAccessAdminRole,
                param.targetContract,
                param.account,
                param.functionSelector,
                param.enabled
            );
        }
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

        for (uint256 i = 0; i < roles.length; ++i) {
            _checkRole(getRoleAdmin(roles[i]), _msgSender());
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
        for (uint256 i = 0; i < roles.length; ++i) {
            _checkRole(getRoleAdmin(roles[i]), _msgSender());
            _revokeRole(roles[i], addresses[i]);
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
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
