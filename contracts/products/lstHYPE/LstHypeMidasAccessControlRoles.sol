// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title LstHypeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for lstHYPE contracts
 * @author RedDuck Software
 */
abstract contract LstHypeMidasAccessControlRoles {
    /**
     * @notice actor that can manage LstHypeDepositVault
     */
    bytes32 public constant LST_HYPE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("LST_HYPE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LstHypeRedemptionVault
     */
    bytes32 public constant LST_HYPE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("LST_HYPE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage LstHypeCustomAggregatorFeed and LstHypeDataFeed
     */
    bytes32 public constant LST_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("LST_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");
}
