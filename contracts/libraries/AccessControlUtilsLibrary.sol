// SPDX-License-Identifier: MIT

pragma solidity 0.8.34;

import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";
import {IMidasTimelockManager} from "../interfaces/IMidasTimelockManager.sol";

/**
 * @title AccessControlUtilsLibrary
 * @author RedDuck Software
 */
library AccessControlUtilsLibrary {
    error InvalidAddress(address addr);
    error HasRole(bytes32 role, address account);
    error HasntRole(bytes32 role, address account);
    error NoFunctionPermission(
        bytes32 roleUsed,
        bytes4 functionSelector,
        address account
    );
    error FunctionNotReady(bytes32 roleUsed, bytes4 functionSelector);
    error SenderIsNotTimelock(
        bytes32 roleUsed,
        bytes4 functionSelector,
        address sender
    );

    /**
     * @dev validates that the function access is valid with timelock
     * @param accessControl access control contract
     * @param contractAdminRole contract admin role
     * @param roleIsFunctionOperator whether the role is a function operator
     * @param accountToCheck account to check
     * @param validateFunctionRole whether to validate the function role
     */
    function validateFunctionAccessWithTimelock(
        IMidasAccessControl accessControl,
        bytes32 contractAdminRole,
        bool roleIsFunctionOperator,
        address accountToCheck,
        bool validateFunctionRole
    ) internal view {
        IMidasTimelockManager timelockManager = IMidasTimelockManager(
            accessControl.timelockManager()
        );
        bool isPreflight = accountToCheck == address(timelockManager);
        bool isTimelock = accountToCheck == timelockManager.timelock();

        address account;

        if (isPreflight || isTimelock) {
            account = getAppendedAddress(msg.data);
        } else {
            account = accountToCheck;
        }

        if (isPreflight) {
            revert IMidasTimelockManager.RolePreflightSucceeded(
                contractAdminRole,
                roleIsFunctionOperator,
                validateFunctionRole
            );
        }

        bytes32 roleUsed = validateFunctionAccess(
            accessControl,
            contractAdminRole,
            roleIsFunctionOperator,
            account,
            msg.sig,
            validateFunctionRole
        );

        (bool ready, bool timelocked) = timelockManager
            .isFunctionReadyToExecute(
                roleUsed,
                address(this),
                msg.data,
                account
            );

        if (!ready) {
            revert FunctionNotReady(roleUsed, msg.sig);
        }

        if (timelocked) {
            require(
                isTimelock,
                SenderIsNotTimelock(roleUsed, msg.sig, accountToCheck)
            );
        }
    }

    /**
     * @dev gets the appended address from the data
     * @param data data to get the appended address from
     * @return appended address
     */
    function getAppendedAddress(bytes calldata data)
        internal
        pure
        returns (address)
    {
        return address(bytes20(data[data.length - 20:]));
    }

    /**
     * @dev validates that the function access is valid
     * @param accessControl access control contract
     * @param role admin role
     * @param roleIsFunctionOperator whether the role is a function operator
     * @param account account to check
     * @param functionSelector function selector
     * @param validateFunctionRole whether to validate the function role
     * @return roleUsed role used to validate the function access
     */
    function validateFunctionAccess(
        IMidasAccessControl accessControl,
        bytes32 role,
        bool roleIsFunctionOperator,
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
        if (roleIsFunctionOperator) {
            bytes32 operatorRole = accessControl.functionAccessGrantOperatorKey(
                role,
                address(this),
                functionSelector
            );

            if (
                accessControl.isFunctionAccessGrantOperator(
                    operatorRole,
                    account
                )
            ) {
                return operatorRole;
            }
        } else {
            if (accessControl.hasRole(role, account)) {
                return role;
            }

            (bytes32 key, bool hasPermission) = validateFunctionRole
                ? hasFunctionPermission(
                    accessControl,
                    role,
                    functionSelector,
                    account
                )
                : (bytes32(0), false);

            if (hasPermission) {
                return key;
            }

            revert NoFunctionPermission(role, msg.sig, account);
        }
    }

    /**
     * @dev checks that given `account` has function permission for the given function selector
     * @param accessControl access control contract
     * @param role OZ role for the scope
     * @param functionSelector function selector
     * @param account address checked for permission
     */
    function hasFunctionPermission(
        IMidasAccessControl accessControl,
        bytes32 role,
        bytes4 functionSelector,
        address account
    ) internal view returns (bytes32 key, bool hasPermission) {
        bytes32 key = accessControl.functionPermissionKey(
            role,
            address(this),
            functionSelector
        );

        hasPermission = accessControl.hasFunctionPermission(key, account);
    }
}
