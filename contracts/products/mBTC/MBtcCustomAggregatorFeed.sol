// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MBtcMidasAccessControlRoles.sol";

/**
 * @title MBtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mBTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MBtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MBtcMidasAccessControlRoles
{
    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
