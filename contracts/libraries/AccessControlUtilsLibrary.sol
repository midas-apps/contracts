// SPDX-License-Identifier: MIT

pragma solidity 0.8.34;

import {IMidasAccessControl} from "../interfaces/IMidasAccessControl.sol";

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
     * @param accountToCheck account to check
     */
    function validateFunctionAccessWithTimelock(
        IMidasAccessControl accessControl,
        bytes32 contractAdminRole,
        address accountToCheck
    ) internal view {
        bool isPreflight = accountToCheck == address(accessControl);
        bool isTimelock = accountToCheck == accessControl.timelock();

        address account;

        if (isPreflight || isTimelock) {
            account = getAppendedAddress(msg.data);
        } else {
            account = accountToCheck;
        }

        bytes32 roleUsed = validateFunctionAccess(
            accessControl,
            contractAdminRole,
            account
        );

        if (isPreflight) {
            revert IMidasAccessControl.RolePreflightSucceeded(roleUsed);
        }

        (bool ready, bool timelocked) = accessControl.isFunctionReadyToExecute(
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
                accountToCheck == accessControl.timelock(),
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

    // TODO: move it to AC?
    /**
     * @dev validates that the function access is valid
     * @param accessControl access control contract
     * @param contractAdminRole contract admin role
     * @param account account to check
     * @return roleUsed role used to validate the function access
     */
    function validateFunctionAccess(
        IMidasAccessControl accessControl,
        bytes32 contractAdminRole,
        address account
    )
        internal
        view
        returns (
            bytes32 /* roleUsed */
        )
    {
        if (accessControl.hasRole(contractAdminRole, account)) {
            return contractAdminRole;
        }

        (bytes32 key, bool hasPermission) = hasFunctionPermission(
            accessControl,
            contractAdminRole,
            msg.sig,
            account
        );

        if (hasPermission) {
            return key;
        }

        revert NoFunctionPermission(contractAdminRole, msg.sig, account);
    }

    /**
     * @dev checks that given `account` has function permission for the given function selector
     * @param accessControl access control contract
     * @param functionAccessAdminRole OZ role for the scope
     * @param functionSelector function selector
     * @param account address checked for permission
     */
    function hasFunctionPermission(
        IMidasAccessControl accessControl,
        bytes32 functionAccessAdminRole,
        bytes4 functionSelector,
        address account
    ) internal view returns (bytes32 key, bool hasPermission) {
        bytes32 key = accessControl.functionPermissionKey(
            functionAccessAdminRole,
            address(this),
            functionSelector
        );

        hasPermission = accessControl.hasFunctionPermission(key, account);
    }
}
