// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./HBUsdtMidasAccessControlRoles.sol";

/**
 * @title HBUsdtCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for hbUSDT,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract HBUsdtCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    HBUsdtMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HB_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
