// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MRe7BtcMidasAccessControlRoles.sol";

/**
 * @title MRe7BtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mRE7BTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MRe7BtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MRe7BtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
