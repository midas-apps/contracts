// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./KitBtcMidasAccessControlRoles.sol";

/**
 * @title KitBtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for kitBTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract KitBtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    KitBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return KIT_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
