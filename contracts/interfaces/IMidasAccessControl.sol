// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IMidasAccessControl is IAccessControlUpgradeable {
    /// @notice OZ `DEFAULT_ADMIN_ROLE` toggled function-access admin for a role.
    event FunctionAccessAdminRoleEnabled(
        bytes32 indexed functionAccessAdminRole,
        bool enabled
    );

    /// @notice Grant operator for a scoped function on `targetContract` was set.
    event FunctionAccessGrantOperatorUpdated(
        bytes32 indexed functionAccessAdminRole,
        address indexed targetContract,
        bytes4 functionSelector,
        address indexed operator,
        bool enabled
    );

    /// @notice Account permission for a scoped function on `targetContract` was set.
    event FunctionPermissionUpdated(
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
     * @param functionAccessAdminRole OZ role for the scope
     * @param enabled whether that role may manage grant operators for the scope
     */
    function setFunctionAccessAdminRoleEnabled(
        bytes32 functionAccessAdminRole,
        bool enabled
    ) external;

    /**
     * @notice Add or remove a grant operator for a specific contract function scope.
     * @dev Caller must hold `functionAccessAdminRole`; role must be enabled via `setFunctionAccessAdminRoleEnabled`.
     * @param functionAccessAdminRole OZ role id governing this scope.
     * @param targetContract contract whose function is scoped.
     * @param functionSelector selector of the scoped function.
     * @param operator address that may call `setFunctionPermission` for this scope.
     * @param enabled grant or revoke grant-operator status.
     */
    function setFunctionAccessGrantOperator(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address operator,
        bool enabled
    ) external;

    /**
     * @notice Grant or revoke function access for an account
     * @dev caller must be a grant operator for the scope
     * @param functionAccessAdminRole OZ role for the scope
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param account address receiving or losing permission
     * @param enabled grant or revoke
     */
    function setFunctionPermission(
        bytes32 functionAccessAdminRole,
        address targetContract,
        bytes4 functionSelector,
        address account,
        bool enabled
    ) external;

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
