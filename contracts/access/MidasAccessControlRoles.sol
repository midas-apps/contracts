// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @title MidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors
 * @author RedDuck Software
 */
abstract contract MidasAccessControlRoles {
    /**
     * @notice actor that can change green list statuses of addresses
     * @dev keccak256("GREENLIST_OPERATOR_ROLE")
     */
    bytes32 public constant GREENLIST_OPERATOR_ROLE =
        0x77c5b782690f31cd39b1abf2448215259a688a75920040c399d96a676bd1999d;

    /**
     * @notice actor that can change black list statuses of addresses
     * @dev keccak256("BLACKLIST_OPERATOR_ROLE")
     */
    bytes32 public constant BLACKLIST_OPERATOR_ROLE =
        0x2fdc6683bc8d03effec5b41d3834f28bd219e06ca0a6a26fc737e44b1c7889ff;

    /**
     * @notice actor that is greenlisted
     * @dev keccak256("GREENLISTED_ROLE")
     */
    bytes32 public constant GREENLISTED_ROLE =
        0xd2576bd6a4c5558421de15cb8ecdf4eb3282aac06b94d4f004e8cd0d00f3ebd8;

    /**
     * @notice actor that is blacklisted
     * @dev keccak256("BLACKLISTED_ROLE")
     */
    bytes32 public constant BLACKLISTED_ROLE =
        0x548c7f0307ab2a7ea894e5c7e8c5353cc750bb9385ee2e945f189a9a83daa8ed;
}
