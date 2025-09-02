// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./ZeroGBtcvMidasAccessControlRoles.sol";

/**
 * @title ZeroGBtcvCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for zeroGBTCV,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract ZeroGBtcvCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    ZeroGBtcvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ZEROG_BTCV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
