// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./TBtcMidasAccessControlRoles.sol";

/**
 * @title TBtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for tBTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract TBtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    TBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return T_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
