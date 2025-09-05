// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title KitHypeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for kitHYPE contracts
 * @author RedDuck Software
 */
abstract contract KitHypeMidasAccessControlRoles {
    /**
     * @notice actor that can manage KitHypeDepositVault
     */
    bytes32 public constant KIT_HYPE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("KIT_HYPE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KitHypeRedemptionVault
     */
    bytes32 public constant KIT_HYPE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("KIT_HYPE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage KitHypeCustomAggregatorFeed and KitHypeDataFeed
     */
    bytes32 public constant KIT_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("KIT_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
