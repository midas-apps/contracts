// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./CarryTradeUsdTryLeverageMidasAccessControlRoles.sol";

/**
 * @title CarryTradeUsdTryLeverageCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for carryTradeUSDTRYLeverage,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract CarryTradeUsdTryLeverageCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    CarryTradeUsdTryLeverageMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return CARRY_TRADE_USD_TRY_LEVERAGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
