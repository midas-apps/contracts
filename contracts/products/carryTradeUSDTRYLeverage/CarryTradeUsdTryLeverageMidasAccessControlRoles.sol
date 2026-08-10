// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title CarryTradeUsdTryLeverageMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for carryTradeUSDTRYLeverage contracts
 * @author RedDuck Software
 */
abstract contract CarryTradeUsdTryLeverageMidasAccessControlRoles {
    /**
     * @notice actor that can manage CarryTradeUsdTryLeverageDepositVault
     */
    bytes32
        public constant CARRY_TRADE_USD_TRY_LEVERAGE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("CARRY_TRADE_USD_TRY_LEVERAGE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage CarryTradeUsdTryLeverageRedemptionVault
     */
    bytes32
        public constant CARRY_TRADE_USD_TRY_LEVERAGE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("CARRY_TRADE_USD_TRY_LEVERAGE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage CarryTradeUsdTryLeverageCustomAggregatorFeed and CarryTradeUsdTryLeverageDataFeed
     */
    bytes32
        public constant CARRY_TRADE_USD_TRY_LEVERAGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256(
            "CARRY_TRADE_USD_TRY_LEVERAGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE"
        );
}
