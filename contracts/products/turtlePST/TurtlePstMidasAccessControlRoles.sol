// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title TurtlePstMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for turtlePST contracts
 * @author RedDuck Software
 */
abstract contract TurtlePstMidasAccessControlRoles {
    /**
     * @notice actor that can manage TurtlePstDepositVault
     */
    bytes32 public constant TURTLE_PST_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("TURTLE_PST_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TurtlePstRedemptionVault
     */
    bytes32 public constant TURTLE_PST_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("TURTLE_PST_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage TurtlePstCustomAggregatorFeed and TurtlePstDataFeed
     */
    bytes32 public constant TURTLE_PST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("TURTLE_PST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
