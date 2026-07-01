// SPDX-License-Identifier: BUSL-1.1

pragma solidity 0.8.34;

import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {IMidasTimelockManager} from "../interfaces/IMidasTimelockManager.sol";

/**
 * @title AccessControlUtilsLibrary
 * @author RedDuck Software
 */
library AccessControlUtilsLibrary {
    /**
     * @notice error when the function permission is not found
     * @param roleUsed role used
     * @param functionSelector function selector
     * @param account account
     */
    error NoFunctionPermission(
        bytes32 roleUsed,
        bytes4 functionSelector,
        address account
    );

    /**
     * @notice error when the account is not greenlisted
     * @param account account
     * @param greenlistedRole greenlisted role
     */
    error NotGreenlisted(address account, bytes32 greenlistedRole);

    /**
     * @notice error when the account is blacklisted
     * @param blacklistedRole blacklisted role
     * @param account account
     */
    error Blacklisted(bytes32 blacklistedRole, address account);

    /**
     * @notice error when the sender is not the timelock
     * @param roleUsed role used
     * @param functionSelector function selector
     * @param sender sender
     */
    error SenderIsNotTimelock(
        bytes32 roleUsed,
        bytes4 functionSelector,
        address sender
    );

    /**
     * @notice error when the user facing role is not allowed
     * @param role role
     */
    error UserFacingRoleNotAllowed(bytes32 role);

    /**
     * @notice error when the delay is invalid
     */
    error InvalidDelay();

    /**
     * @notice default role for greenlisted actor
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant DEFAULT_GREENLISTED_ROLE =
        keccak256("GREENLISTED_ROLE");

    /**
     * @notice default role for blacklisted actor
     */
    // solhint-disable-next-line private-vars-leading-underscore
    bytes32 internal constant DEFAULT_BLACKLISTED_ROLE =
        keccak256("BLACKLISTED_ROLE");

    /**
     * @notice timelock value that represents no delay
     */
    // solhint-disable-next-line private-vars-leading-underscore
    uint32 internal constant NO_DELAY = type(uint32).max;

    /**
     * @notice timelock value that represents non-set delay
     */
    // solhint-disable-next-line private-vars-leading-underscore
    uint32 internal constant NULL_DELAY = 0;

    /**
     * @notice maximum delay for a role
     */
    // solhint-disable-next-line private-vars-leading-underscore
    uint32 internal constant MAX_DELAY = 7 days;

    /**
     * @dev validates that the function access is valid with timelock
     * @param accessControl access control contract
     * @param contractAdminRole contract admin role
     * @param roleIsFunctionOperatorRole whether the role is a function operator
     * @param accountToCheck account to check
     * @param validateFunctionRole whether to validate the function role
     * @return actualAccount actual account that has access to the function
     */
    function validateFunctionAccessWithTimelock(
        IMidasAccessControl accessControl,
        bytes32 contractAdminRole,
        uint32 overrideDelay,
        bool roleIsFunctionOperatorRole,
        address accountToCheck,
        bool validateFunctionRole
    )
        internal
        view
        returns (
            address /* actualAccount */
        )
    {
        IMidasTimelockManager timelockManager = IMidasTimelockManager(
            accessControl.timelockManager()
        );

        bool isPreflight = accountToCheck == address(timelockManager);
        bool isTimelock = accountToCheck == timelockManager.timelock();

        if (isPreflight) {
            revert IMidasTimelockManager.RolePreflightSucceeded(
                contractAdminRole,
                overrideDelay,
                roleIsFunctionOperatorRole,
                validateFunctionRole
            );
        }

        address account = isTimelock
            ? timelockManager.getOriginalProposer(address(this), msg.data)
            : accountToCheck;

        bytes32 roleUsed = validateFunctionAccess(
            accessControl,
            address(this),
            contractAdminRole,
            overrideDelay,
            roleIsFunctionOperatorRole,
            account,
            msg.sig,
            validateFunctionRole
        );

        (uint32 delay, ) = accessControl.getRoleTimelockDelay(
            roleUsed,
            overrideDelay
        );

        if (delay > 0) {
            require(
                isTimelock,
                SenderIsNotTimelock(roleUsed, msg.sig, accountToCheck)
            );
        }

        return account;
    }

    /**
     * @dev validates that the function access is valid
     * @param accessControl access control contract
     * @param role admin role
     * @param overrideDelay override delay for the invocation
     * @param roleIsFunctionOperatorRole whether the role is a function operator role
     * @param account account to check
     * @param functionSelector function selector
     * @param validateFunctionRole whether to validate the function role
     * @return roleUsed role used to validate the function access
     */
    function validateFunctionAccess(
        IMidasAccessControl accessControl,
        address targetContract,
        bytes32 role,
        uint32 overrideDelay,
        bool roleIsFunctionOperatorRole,
        address account,
        bytes4 functionSelector,
        bool validateFunctionRole
    )
        internal
        view
        returns (
            bytes32 /* roleUsed */
        )
    {
        validateTimelockDelay(overrideDelay);

        if (roleIsFunctionOperatorRole) {
            if (accessControl.isFunctionAccessGrantOperator(role, account)) {
                return role;
            }
            revert NoFunctionPermission(role, functionSelector, account);
        }

        requireNotUserFacingRole(accessControl, role);

        bool hasRootRole = accessControl.hasRole(role, account);

        (bytes32 key, bool hasPermission) = validateFunctionRole
            ? _hasFunctionPermission(
                accessControl,
                targetContract,
                role,
                functionSelector,
                account
            )
            : (bytes32(0), false);

        if (!hasPermission && !hasRootRole) {
            revert NoFunctionPermission(role, functionSelector, account);
        }

        if (!hasRootRole) {
            return key;
        }

        if (!hasPermission) {
            return role;
        }

        return resolveAccessRole(accessControl, role, key, overrideDelay);
    }

    /**
     * @dev validates that the role is not a user facing role
     * @param accessControl access control contract
     * @param role role
     */
    function requireNotUserFacingRole(
        IMidasAccessControl accessControl,
        bytes32 role
    ) internal view {
        require(
            !accessControl.isUserFacingRole(role),
            UserFacingRoleNotAllowed(role)
        );
    }

    /**
     * @dev checks that a given `account` has `greenlistedRole`
     * @param accessControl access control contract
     * @param account account
     * @param greenlistedRole greenlisted role
     */
    function requireGreenlisted(
        IMidasAccessControl accessControl,
        address account,
        bytes32 greenlistedRole
    ) internal view {
        require(
            accessControl.hasRole(greenlistedRole, account),
            NotGreenlisted(account, greenlistedRole)
        );
    }

    /**
     * @dev checks that a given `account` doesnt have `blacklistedRole`
     * @param accessControl access control contract
     * @param account account
     * @param blacklistedRole blacklisted role
     */
    function requireNotBlacklisted(
        IMidasAccessControl accessControl,
        address account,
        bytes32 blacklistedRole
    ) internal view {
        require(
            !accessControl.hasRole(blacklistedRole, account),
            Blacklisted(blacklistedRole, account)
        );
    }

    /**
     * @dev resolves the access role based on the shortest delay
     * @param accessControl access control contract
     * @param rootRole root role
     * @param functionRoleKey function key
     * @param overrideDelay override delay
     * @return roleUsed role used to validate the function access
     */
    function resolveAccessRole(
        IMidasAccessControl accessControl,
        bytes32 rootRole,
        bytes32 functionRoleKey,
        uint32 overrideDelay
    ) internal view returns (bytes32 roleUsed) {
        if (overrideDelay != NULL_DELAY) {
            return rootRole;
        }
        (uint32 rootDelay, ) = accessControl.getRoleTimelockDelay(
            rootRole,
            overrideDelay
        );
        (uint32 functionDelay, ) = accessControl.getRoleTimelockDelay(
            functionRoleKey,
            overrideDelay
        );
        return rootDelay <= functionDelay ? rootRole : functionRoleKey;
    }

    /**
     * @notice validates that the delay is within the maximum delay
     * @param delay delay to validate
     */
    function validateTimelockDelay(uint32 delay) internal view {
        if (delay != NO_DELAY) {
            require(delay <= MAX_DELAY, InvalidDelay());
        }
    }

    /**
     * @dev checks that given `account` has function permission for the given function selector
     * @param accessControl access control contract
     * @param role OZ role for the scope
     * @param targetContract scoped contract
     * @param functionSelector function selector
     * @param account address checked for permission
     */
    function _hasFunctionPermission(
        IMidasAccessControl accessControl,
        address targetContract,
        bytes32 role,
        bytes4 functionSelector,
        address account
    ) private view returns (bytes32 key, bool hasPermission) {
        key = accessControl.permissionRoleKey(
            role,
            targetContract,
            functionSelector
        );

        hasPermission = accessControl.hasFunctionPermission(key, account);
    }
}
