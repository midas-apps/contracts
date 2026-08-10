// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./StockMarketTRBasisTradeMidasAccessControlRoles.sol";

/**
 * @title StockMarketTRBasisTradeCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for stockMarketTRBasisTrade,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract StockMarketTRBasisTradeCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    StockMarketTRBasisTradeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return STOCK_MARKET_TR_BASIS_TRADE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
