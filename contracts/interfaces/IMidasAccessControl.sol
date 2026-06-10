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
     * @notice Array arguments have different lengths
     */
    error MismatchingArrayLengths();

    /**
     * @notice when the role is being revoked from the self
     * @param role role to be revoked
     * @param account account to be revoked
     */
    error CannotRevokeFromSelf(bytes32 role, address account);

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
        /// @notice contract whose function is scoped.
        address targetContract;
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
    event SetDefaultDelay(uint256 defaultDelay);

    /**
     * @param roles role ids
     * @param delays delay values per role
     */
    event SetRoleDelays(bytes32[] roles, uint256[] delays);

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
     * @dev target contract must implement `IMidasAccessControlManaged` interface;
     * Caller must hold `contractAdminRole` of a target contract;
     * @param params array of SetGrantOperatorRoleParams
     */
    function setGrantOperatorRoleMult(
        SetGrantOperatorRoleParams[] calldata params
    ) external;

    /**
     * @notice Grant or revoke function access for an account
     * @dev caller must be a grant operator for the scope
     * target contract must implement `IMidasAccessControlManaged` interface;
     * @param targetContract scoped contract
     * @param functionSelector scoped function
     * @param params array of SetPermissionRoleParams
     */
    function setPermissionRoleMult(
        address targetContract,
        bytes4 functionSelector,
        SetPermissionRoleParams[] calldata params
    ) external;

    /**
     * @notice Sets the default delay
     * @param _defaultDelay default delay in seconds
     */
    function setDefaultDelay(uint256 _defaultDelay) external;

    /**
     * @notice Sets timelock delay per role
     * @param roles role ids
     * @param delays delay values (0 = default, max uint = no delay)
     */
    function setRoleDelays(bytes32[] memory roles, uint256[] memory delays)
        external;

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
    function getRoleTimelockDelay(bytes32 role, uint256 overrideDelay)
        external
        view
        returns (uint256 delay, bool isDefault);

    /**
     * @notice Default timelock delay when role delay is not set
     * @return delay delay in seconds
     */
    function defaultDelay() external view returns (uint256 delay);

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
