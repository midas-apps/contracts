// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MevBtcMidasAccessControlRoles.sol";

/**
 * @title MevBtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mevBTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MevBtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MevBtcMidasAccessControlRoles
{
    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return MEV_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
