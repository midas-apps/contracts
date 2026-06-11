// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IMidasAccessControl is IAccessControlUpgradeable {
    /**
     * @notice when the array is empty
     */
    error EmptyArray();

    /**
     * @notice when the arrays have different lengths
     * @param length1 length of the first array
     * @param length2 length of the second array
     */
    error MismatchArrays(uint256 length1, uint256 length2);

    /**
     * @notice error when the function is forbidden
     */
    error Forbidden();

    /**
     * @notice when the role is being revoked from the self
     * @param role role to be revoked
     * @param account account to be revoked
     */
    error CannotRevokeFromSelf(bytes32 role, address account);

    /**
     * @notice when the delay is invalid
     */
    error InvalidTimelockDelay();

    /**
     * @notice when the role admin mismatch
     * @param role role to be revoked
     * @param adminRole admin role
     */
    error RoleAdminMismatch(bytes32 role, bytes32 adminRole);

    /**
     * @notice Set user facing role params
     */
    struct SetUserFacingRoleParams {
        /// @notice OZ role for the scope
        bytes32 role;
        /// @notice whether that role is user facing
        bool enabled;
    }

    /**
     * @notice Set function access grant operator params
     */
    struct SetGrantOperatorRoleParams {
        /// @notice delay value
        uint32 delay;
        /// @notice selector of the scoped function.
        bytes4 functionSelector;
        /// @notice address that may call `setFunctionPermission` for this scope.
        address operator;
        /// @notice grant or revoke grant-operator status.
        bool enabled;
    }

    /**
     * @notice Set function permission params
     */
    struct SetPermissionRoleParams {
        /// @notice address receiving or losing permission
        address account;
        /// @notice grant or revoke permission
        bool enabled;
    }

    /**
     * @notice Grant role params
     */
    struct GrantRoleMultParams {
        /// @notice role to be granted
        bytes32 role;
        /// @notice account to be granted the role
        address account;
        /// @notice delay value
        uint32 delay;
    }

    /**
     * @notice Revoke role params
     */
    struct RevokeRoleMultParams {
        /// @notice role to be revoked
        bytes32 role;
        /// @notice account to be revoked the role
        address account;
    }

    /**
     * @notice Set role delay params
     */
    struct SetRoleDelayParams {
        /// @notice role to be set the delay for
        bytes32 role;
        /// @notice delay value
        uint32 delay;
    }

    /**
     * @param role OZ role for the scope
     * @param enabled whether that role is user facing
     */
    event SetUserFacingRole(bytes32 indexed role, bool enabled);

    /**
     * @param masterRole OZ role for the scope
     * @param targetContract contract whose function is scoped.
     * @param functionSelector selector of the scoped function.
     * @param operator address that may call `setFunctionPermission` for this scope.
     * @param enabled grant or revoke grant-operator status.
     */
    event SetGrantOperatorRole(
        bytes32 indexed masterRole,
        address indexed targetContract,
        address indexed operator,
        bytes4 functionSelector,
        bool enabled
    );

    /**
     * @param masterRole OZ role for the scope
     * @param targetContract contract whose function is scoped.
     * @param account address receiving or losing permission
     * @param functionSelector selector of the scoped function.
     * @param enabled grant or revoke
     */
    event SetPermissionRole(
        bytes32 indexed masterRole,
        address indexed targetContract,
        address indexed account,
        bytes4 functionSelector,
        bool enabled
    );

    /**
     * @param defaultDelay new default delay
     */
    event SetDefaultDelay(uint32 defaultDelay);

    /**
     * @param params array of SetRoleDelayParams
     */
    event SetRoleDelays(SetRoleDelayParams[] params);

    /**
     * @param role role id
     * @param delay delay value
     */
    event SetRoleDelay(bytes32 role, uint32 delay);

    /**
     * @notice Enable or disable which OZ role may administer function-access scopes for that role.
     * @dev Only `DEFAULT_ADMIN_ROLE` can call this function.
     * Prevents unrelated role admins from spamming access mappings.
     * @param params array of SetUserFacingRoleParams
     */
    function setUserFacingRoleMult(SetUserFacingRoleParams[] calldata params)
        external;

    /**
     * @notice Add or remove a grant operator for a specific contract function scope.
     * @dev `targetContract` must implement `IMidasAccessControlManaged` interface;
     * Caller must hold `contractAdminRole` of a target contract;
     * @param targetContract scoped contract
     * @param params array of SetGrantOperatorRoleParams
     */
    function setGrantOperatorRoleMult(
        address targetContract,
        SetGrantOperatorRoleParams[] calldata params
    ) external;

    /**
     * @notice Grant or revoke function access for an account
     * @dev caller must be a grant operator for the scope or have the master role
     * target contract must implement `IMidasAccessControlManaged` interface;
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param delay delay value
     * @param params array of SetPermissionRoleParams
     */
    function setPermissionRoleMult(
        address targetContract,
        bytes4 functionSelector,
        uint32 delay,
        SetPermissionRoleParams[] calldata params
    ) external;

    /**
     * @notice Grant a role to an account with a delay
     * @param role role id
     * @param account account to grant the role to
     * @param delay delay value
     */
    function grantRole(
        bytes32 role,
        address account,
        uint32 delay
    ) external;

    /**
     * @notice grant multiple roles to multiple users in one transaction
     * @param params array of GrantRoleMultParams
     */
    function grantRoleMult(GrantRoleMultParams[] calldata params) external;

    /**
     * @notice revoke multiple roles from multiple users in one transaction
     * @param params array of RevokeRoleMultParams
     */
    function revokeRoleMult(RevokeRoleMultParams[] calldata params) external;

    /**
     * @notice Sets the default delay
     * @param _defaultDelay default delay in seconds
     */
    function setDefaultDelay(uint32 _defaultDelay) external;

    /**
     * @notice Sets timelock delay per role
     * @param params array of SetRoleDelayParams
     */
    function setRoleDelayMult(SetRoleDelayParams[] calldata params) external;

    /**
     * @notice set the admin role for a specific role
     * @dev can be called only by the address that holds `DEFAULT_ADMIN_ROLE`
     * @param role the role to set the admin role for
     * @param newAdminRole the new admin role
     */
    function setRoleAdmin(bytes32 role, bytes32 newAdminRole) external;

    /**
     * @notice Whether `role` is user facing.
     * @param role OZ role for the scope
     * @return enabled whether `role` is user facing
     */
    function isUserFacingRole(bytes32 role) external view returns (bool);

    /**
     * @notice Whether `operator` may call `setFunctionPermission` for the function scope
     * @param masterRole OZ role for the scope
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param operator address checked for grant-operator status
     * @return allowed whether `operator` is a grant operator for the scope
     */
    function isFunctionAccessGrantOperator(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector,
        address operator
    ) external view returns (bool);

    /**
     * @notice Whether `operator` may call `setFunctionPermission` for the function scope
     * @param key operator permission key
     * @param operator address checked for grant-operator status
     * @return allowed whether `operator` is a grant operator for the scope
     */
    function isFunctionAccessGrantOperator(bytes32 key, address operator)
        external
        view
        returns (bool);

    /**
     * @notice Whether `account` may call the scoped function on `targetContract`.
     * @param masterRole OZ role for the scope
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param account address checked for permissio.
     * @return allowed whether `account` has function access for the scope
     */
    function hasFunctionPermission(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector,
        address account
    ) external view returns (bool);

    /**
     * @notice Whether `account` has function access for the scope.
     * @param key the base key for function permission mappings
     * @param account address checked for permission
     * @return allowed whether `account` has function access for the scope
     */
    function hasFunctionPermission(bytes32 key, address account)
        external
        view
        returns (bool);

    /**
     * @notice calculates the base key for function permission mappings
     * @param masterRole OZ role
     * @param targetContract scoped contract
     * @param functionSelector scoped function of a `targetContract`
     * @return key the base key for function permission mappings
     */
    function permissionRoleKey(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector
    ) external pure returns (bytes32);

    /**
     * @notice calculates the base key for function permission mappings
     * @param masterRole OZ role
     * @param targetContract scoped contract
     * @param functionSelector scoped function of a `targetContract`
     * @return key the base key for function permission mappings
     */
    function grantOperatorRoleKey(
        bytes32 masterRole,
        address targetContract,
        bytes4 functionSelector
    ) external pure returns (bytes32);

    /**
     * @notice Returns timelock delay for a role
     * @param role role id
     * @param overrideDelay override delay for the invocation
     * @return delay effective delay in seconds
     * @return isDefault true if role uses default delay
     */
    function getRoleTimelockDelay(bytes32 role, uint32 overrideDelay)
        external
        view
        returns (uint32 delay, bool isDefault);

    /**
     * @notice Default timelock delay when role delay is not set
     * @return delay delay in seconds
     */
    function defaultDelay() external view returns (uint32 delay);

    /**
     * @notice address of the timelock manager
     * @return timelockManager address of the timelock manager
     */
    function timelockManager() external view returns (address);

    /**
     * @notice address of the pause manager
     * @return pauseManager address of the pause manager
     */
    function pauseManager() external view returns (address);
}
