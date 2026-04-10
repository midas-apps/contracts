// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IMidasAccessControl is IAccessControlUpgradeable {
    /**
     * @param functionAccessAdminRole OZ role for the scope
     * @param enabled whether that role may manage grant operators for the scope
     */
    struct SetFunctionAccessAdminRoleEnabledParams {
        bytes32 functionAccessAdminRole;
        bool enabled;
    }

    /**
     * @param functionAccessAdminRole OZ role id governing this scope.
     * @param targetContract contract whose function is scoped.
     * @param functionSelector selector of the scoped function.
     * @param operator address that may call `setFunctionPermission` for this scope.
     * @param enabled grant or revoke grant-operator status.
     */
    struct SetFunctionAccessGrantOperatorParams {
        bytes32 functionAccessAdminRole;
        address targetContract;
        bytes4 functionSelector;
        address operator;
        bool enabled;
    }

    /**
     * @param functionAccessAdminRole OZ role for the scope
     * @param targetContract contract whose function is scoped.
     * @param functionSelector selector of the scoped function.
     * @param account address receiving or losing permission
     * @param enabled grant or revoke
     */
    struct SetFunctionPermissionParams {
        bytes32 functionAccessAdminRole;
        address targetContract;
        bytes4 functionSelector;
        address account;
        bool enabled;
    }

    /**
     * @param functionAccessAdminRole OZ role for the scope
     * @param enabled whether that role may manage grant operators for the scope.
     */
    event FunctionAccessAdminRoleEnable(
        bytes32 indexed functionAccessAdminRole,
        bool enabled
    );

    /**
     * @param functionAccessAdminRole OZ role for the scope
     * @param targetContract contract whose function is scoped.
     * @param functionSelector selector of the scoped function.
     * @param operator address that may call `setFunctionPermission` for this scope.
     * @param enabled grant or revoke grant-operator status.
     */
    event FunctionAccessGrantOperatorUpdate(
        bytes32 indexed functionAccessAdminRole,
        address indexed targetContract,
        bytes4 functionSelector,
        address indexed operator,
        bool enabled
    );

    /**
     * @param functionAccessAdminRole OZ role for the scope
     * @param targetContract contract whose function is scoped.
     * @param account address receiving or losing permission
     * @param functionSelector selector of the scoped function.
     * @param enabled grant or revoke
     */
    event FunctionPermissionUpdate(
        bytes32 indexed functionAccessAdminRole,
        address indexed targetContract,
        address indexed account,
        bytes4 functionSelector,
        bool enabled
    );

    /**
     * @notice Enable or disable which OZ role may administer function-access scopes for that role.
     * @dev Only `DEFAULT_ADMIN_ROLE` can call this function.
     * Prevents unrelated role admins from spamming access mappings.
     * @param params array of SetFunctionAccessAdminRoleEnabledParams
     */
    function setFunctionAccessAdminRoleEnabledMult(
        SetFunctionAccessAdminRoleEnabledParams[] calldata params
    ) external;

    /**
     * @notice Add or remove a grant operator for a specific contract function scope.
     * @dev Caller must hold `functionAccessAdminRole`; role must be enabled via `setFunctionAccessAdminRoleEnabled`.
     * @param params array of SetFunctionAccessGrantOperatorParams
     */
    function setFunctionAccessGrantOperatorMult(
        SetFunctionAccessGrantOperatorParams[] calldata params
    ) external;

    /**
     * @notice Grant or revoke function access for an account
     * @dev caller must be a grant operator for the scope
     * @param params array of SetFunctionPermissionParams
     */
    function setFunctionPermissionMult(
        SetFunctionPermissionParams[] calldata params
    ) external;

    /**
     * @notice set the admin role for a specific role
     * @dev can be called only by the address that holds `DEFAULT_ADMIN_ROLE`
     * @param role the role to set the admin role for
     * @param newAdminRole the new admin role
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external;

    /**
     * @notice Whether `operator` may call `setFunctionPermission` for the function scope
     * @param functionAccessAdminRole OZ role for the scope
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param operator address checked for grant-operator status
     * @return allowed whether `operator` is a grant operator for the scope
     */
    function isFunctionAccessGrantOperator(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address operator
    ) external view returns (bool);

    /**
     * @notice Whether `account` may call the scoped function on `targetContract`.
     * @param functionAccessAdminRole OZ role for the scope
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param account address checked for permissio.
     * @return allowed whether `account` has function access for the scope
     */
    function hasFunctionPermission(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address account
    ) external view returns (bool);
}
