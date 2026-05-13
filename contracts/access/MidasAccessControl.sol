// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

import {MidasAccessControlRoles} from "./MidasAccessControlRoles.sol";
import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {AccessControlUtilsLibrary} from "../libraries/AccessControlUtilsLibrary.sol";
import {TimelockControllerUpgradeable as TimelockController} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

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
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public timelockManager;

    /**
     * @notice address of MidasAccessControlTimelockController contract
     */
    address public pauseManager;

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
     * @notice initializes timelock manager. Moved to a searate initializer
     * as its 2-way dependency between the contracts.
     * @dev can be called only by DEFAULT_ADMIN_ROLE
     * @param _timelockManager address of the timelock manager
     * @param _pauseManager address of the pause manager
     */
    function initializeRelationships(
        address _timelockManager,
        address _pauseManager
    ) external {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        require(
            timelockManager == address(0),
            "MAC: timelock manager already set"
        );
        require(
            _timelockManager != address(0),
            "MAC: invalid timelock manager"
        );
        require(pauseManager == address(0), "MAC: pause manager already set");
        require(_pauseManager != address(0), "MAC: invalid pause manager");

        timelockManager = _timelockManager;
        pauseManager = _pauseManager;
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setFunctionAccessAdminRoleEnabledMult(
        SetFunctionAccessAdminRoleEnabledParams[] calldata params
    ) external {
        _validateRoleAccess(DEFAULT_ADMIN_ROLE, _msgSender(), true);

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
        bytes32 functionAccessAdminRole,
        SetFunctionAccessGrantOperatorParams[] calldata params
    ) external {
        require(
            functionAccessAdminRoleEnabled[functionAccessAdminRole],
            "MAC: FA admin role disabled"
        );
        _validateRoleAccess(functionAccessAdminRole, _msgSender(), false);

        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionAccessGrantOperatorParams memory param = params[i];

            bytes32 operatorKey = functionAccessGrantOperatorKey(
                functionAccessAdminRole,
                param.targetContract,
                param.functionSelector
            );

            // if already enabled, skip and do not emit event
            if (_functionAccessGrantOperators[operatorKey][param.operator]) {
                continue;
            }

            _functionAccessGrantOperators[operatorKey][param.operator] = param
                .enabled;
            emit FunctionAccessGrantOperatorUpdate(
                functionAccessAdminRole,
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
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        SetFunctionPermissionParams[] calldata params
    ) external {
        require(params.length > 0, "MAC: no params");

        bytes32 operatorRole = functionAccessGrantOperatorKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );

        require(
            isFunctionAccessGrantOperator(operatorRole, _msgSender()),
            "MAC: not FA grant operator"
        );

        _validateOperatorRoleAccess(operatorRole, _msgSender());

        bytes32 functionKey = functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );

        for (uint256 i = 0; i < params.length; ++i) {
            SetFunctionPermissionParams memory param = params[i];

            // if already enabled, skip and do not emit event
            if (_functionPermissions[functionKey][param.account]) {
                continue;
            }

            _functionPermissions[functionKey][param.account] = param.enabled;
            emit FunctionPermissionUpdate(
                functionAccessAdminRole,
                targetContract,
                param.account,
                functionSelector,
                param.enabled
            );
        }
    }

    /**
     * @inheritdoc AccessControlUpgradeable
     */
    function grantRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        _validateRoleAccess(getRoleAdmin(role), _msgSender(), false);
        _grantRole(role, account);
    }

    /**
     * @inheritdoc AccessControlUpgradeable
     */
    function revokeRole(bytes32 role, address account)
        public
        override(AccessControlUpgradeable, IAccessControlUpgradeable)
    {
        _validateRoleAccess(getRoleAdmin(role), _msgSender(), false);
        _revokeRole(role, account);
    }

    /**
     * @notice grant multiple roles to multiple users
     * in one transaction
     * @dev length`s of 2 arays should match. All the roles should have the same admin role.
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function grantRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");
        require(roles.length > 0, "MAC: no roles");

        bytes32 adminRole = getRoleAdmin(roles[0]);
        _validateRoleAccess(adminRole, _msgSender(), false);

        for (uint256 i = 0; i < roles.length; ++i) {
            require(
                getRoleAdmin(roles[i]) == adminRole,
                "MAC: role admin mismatch"
            );
            _grantRole(roles[i], addresses[i]);
        }
    }

    /**
     * @notice revoke multiple roles from multiple users
     * in one transaction
     * @dev length`s of 2 arays should match. All the roles should have the same admin role.
     * @param roles array of bytes32 roles
     * @param addresses array of user addresses
     */
    function revokeRoleMult(bytes32[] memory roles, address[] memory addresses)
        external
    {
        require(roles.length == addresses.length, "MAC: mismatch arrays");
        require(roles.length > 0, "MAC: no roles");

        bytes32 adminRole = getRoleAdmin(roles[0]);
        _validateRoleAccess(adminRole, _msgSender(), false);

        for (uint256 i = 0; i < roles.length; ++i) {
            require(
                getRoleAdmin(roles[i]) == adminRole,
                "MAC: role admin mismatch"
            );
            _revokeRole(roles[i], addresses[i]);
        }
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external {
        _validateRoleAccess(getRoleAdmin(role), _msgSender(), true);
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
        bytes32 key = functionAccessGrantOperatorKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        return isFunctionAccessGrantOperator(key, operator);
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function isFunctionAccessGrantOperator(bytes32 key, address operator)
        public
        view
        returns (bool)
    {
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
        bytes32 key = functionPermissionKey(
            functionAccessAdminRole,
            targetContract,
            functionSelector
        );
        return _functionPermissions[key][account];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function hasFunctionPermission(bytes32 key, address account)
        external
        view
        returns (bool)
    {
        return _functionPermissions[key][account];
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function functionPermissionKey(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector
    ) public pure returns (bytes32) {
        return
            _functionPermissionKey(
                functionAccessAdminRole,
                targetContract,
                functionSelector,
                ""
            );
    }

    /**
     * @inheritdoc IMidasAccessControl
     */
    function functionAccessGrantOperatorKey(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector
    ) public pure returns (bytes32) {
        return
            _functionPermissionKey(
                functionAccessAdminRole,
                targetContract,
                functionSelector,
                "operator"
            );
    }

    /**
     * @dev calculates the base key for function permission mappings
     * @param functionAccessAdminRole OZ role for the scope
     */
    function _functionPermissionKey(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        bytes memory additionalData
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    functionAccessAdminRole,
                    targetContract,
                    functionSelector,
                    additionalData
                )
            );
    }

    /**
     * @dev setup roles during the contracts initialization
     */
    function _setupRoles(address admin) private {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        _setRoleAdmin(BLACKLISTED_ROLE, BLACKLIST_OPERATOR_ROLE);
        _setRoleAdmin(GREENLISTED_ROLE, GREENLIST_OPERATOR_ROLE);
    }

    function _validateRoleAccess(
        bytes32 role,
        address account,
        bool validateFunctionRole
    ) internal view {
        AccessControlUtilsLibrary.validateFunctionAccessWithTimelock(
            this,
            role,
            false,
            account,
            validateFunctionRole
        );
    }

    function _validateOperatorRoleAccess(bytes32 role, address account)
        internal
        view
    {
        AccessControlUtilsLibrary.validateFunctionAccessWithTimelock(
            this,
            role,
            true,
            account,
            false
        );
    }
}
