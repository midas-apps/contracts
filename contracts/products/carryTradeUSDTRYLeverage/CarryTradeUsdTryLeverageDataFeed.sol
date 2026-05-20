// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./CarryTradeUsdTryLeverageMidasAccessControlRoles.sol";

/**
 * @title CarryTradeUsdTryLeverageDataFeed
 * @notice DataFeed for carryTradeUSDTRYLeverage product
 * @author RedDuck Software
 */
contract CarryTradeUsdTryLeverageDataFeed is
    DataFeed,
    CarryTradeUsdTryLeverageMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return CARRY_TRADE_USD_TRY_LEVERAGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
