// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./StockMarketTRBasisTradeMidasAccessControlRoles.sol";

/**
 * @title StockMarketTRBasisTradeDataFeed
 * @notice DataFeed for stockMarketTRBasisTrade product
 * @author RedDuck Software
 */
contract StockMarketTRBasisTradeDataFeed is
    DataFeed,
    StockMarketTRBasisTradeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return STOCK_MARKET_TR_BASIS_TRADE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
