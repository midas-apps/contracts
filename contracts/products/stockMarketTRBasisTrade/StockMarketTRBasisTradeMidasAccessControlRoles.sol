// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @title StockMarketTRBasisTradeMidasAccessControlRoles
 * @notice Base contract that stores all roles descriptors for stockMarketTRBasisTrade contracts
 * @author RedDuck Software
 */
abstract contract StockMarketTRBasisTradeMidasAccessControlRoles {
    /**
     * @notice actor that can manage StockMarketTRBasisTradeDepositVault
     */
    bytes32
        public constant STOCK_MARKET_TR_BASIS_TRADE_DEPOSIT_VAULT_ADMIN_ROLE =
        keccak256("STOCK_MARKET_TR_BASIS_TRADE_DEPOSIT_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage StockMarketTRBasisTradeRedemptionVault
     */
    bytes32
        public constant STOCK_MARKET_TR_BASIS_TRADE_REDEMPTION_VAULT_ADMIN_ROLE =
        keccak256("STOCK_MARKET_TR_BASIS_TRADE_REDEMPTION_VAULT_ADMIN_ROLE");

    /**
     * @notice actor that can manage StockMarketTRBasisTradeCustomAggregatorFeed and StockMarketTRBasisTradeDataFeed
     */
    bytes32
        public constant STOCK_MARKET_TR_BASIS_TRADE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256(
            "STOCK_MARKET_TR_BASIS_TRADE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE"
        );
}
