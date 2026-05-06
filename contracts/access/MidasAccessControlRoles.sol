// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title MidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors
 * @author RedDuck Software
 */
abstract contract MidasAccessControlRoles {
    /**
     * @notice actor that can change green list statuses of addresses
     */
    bytes32 public constant GREENLIST_OPERATOR_ROLE =
        keccak256("GREENLIST_OPERATOR_ROLE");

    /**
     * @notice actor that can change black list statuses of addresses
     */
    bytes32 public constant BLACKLIST_OPERATOR_ROLE =
        keccak256("BLACKLIST_OPERATOR_ROLE");

    /**
     * @notice actor that is greenlisted
     */
    bytes32 public constant GREENLISTED_ROLE = keccak256("GREENLISTED_ROLE");

    /**
     * @notice actor that is blacklisted
     */
    bytes32 public constant BLACKLISTED_ROLE = keccak256("BLACKLISTED_ROLE");
}
