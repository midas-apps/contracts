// SPDX-License-Identifier: MIT

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
     * @notice error when the function is not ready
     * @param roleUsed role used
     * @param functionSelector function selector
     */
    error FunctionNotReady(bytes32 roleUsed, bytes4 functionSelector);

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

    // solhint-disable-next-line private-vars-leading-underscore
    uint256 internal constant NO_DELAY = type(uint256).max;
    // solhint-disable-next-line private-vars-leading-underscore
    uint256 internal constant NULL_DELAY = 0;

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
        uint256 overrideDelay,
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
            contractAdminRole,
            roleIsFunctionOperatorRole,
            account,
            msg.sig,
            validateFunctionRole
        );

        (bool ready, bool timelocked) = timelockManager
            .isFunctionReadyToExecute(
                roleUsed,
                overrideDelay,
                address(this),
                msg.data
            );

        require(ready, FunctionNotReady(roleUsed, msg.sig));

        if (timelocked) {
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
     * @param roleIsFunctionOperatorRole whether the role is a function operator role
     * @param account account to check
     * @param functionSelector function selector
     * @param validateFunctionRole whether to validate the function role
     * @return roleUsed role used to validate the function access
     */
    function validateFunctionAccess(
        IMidasAccessControl accessControl,
        bytes32 role,
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
        if (roleIsFunctionOperatorRole) {
            if (accessControl.isFunctionAccessGrantOperator(role, account)) {
                return role;
            }
        } else {
            require(
                !accessControl.isUserFacingRole(role),
                UserFacingRoleNotAllowed(role)
            );

            if (accessControl.hasRole(role, account)) {
                return role;
            }

            (bytes32 key, bool hasPermission) = validateFunctionRole
                ? _hasFunctionPermission(
                    accessControl,
                    role,
                    functionSelector,
                    account
                )
                : (bytes32(0), false);

            if (hasPermission) {
                return key;
            }
        }
        revert NoFunctionPermission(role, msg.sig, account);
    }

    /**
     * @dev checks that given `account` has function permission for the given function selector
     * @param accessControl access control contract
     * @param role OZ role for the scope
     * @param functionSelector function selector
     * @param account address checked for permission
     */
    function _hasFunctionPermission(
        IMidasAccessControl accessControl,
        bytes32 role,
        bytes4 functionSelector,
        address account
    ) private view returns (bytes32 key, bool hasPermission) {
        key = accessControl.functionPermissionKey(
            role,
            address(this),
            functionSelector
        );

        hasPermission = accessControl.hasFunctionPermission(key, account);
    }
}
