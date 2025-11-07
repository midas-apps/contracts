// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title MPortofinoMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for mPortofino contracts
 * @author RedDuck Software
 */
abstract contract MPortofinoMidasAccessControlRoles {
    /**
     * @notice actor that can manage MPortofinoDepositVault
     */
    bytes32 public constant M_PORTOFINO_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("M_PORTOFINO_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MPortofinoRedemptionVault
     */
    bytes32 public constant M_PORTOFINO_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("M_PORTOFINO_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage MPortofinoCustomAggregatorFeed and MPortofinoDataFeed
     */
    bytes32 public constant M_PORTOFINO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("M_PORTOFINO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
