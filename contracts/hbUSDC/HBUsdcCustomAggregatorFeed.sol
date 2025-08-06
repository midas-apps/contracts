// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./HBUsdcMidasAccessControlRoles.sol";

/**
 * @title HBUsdcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for hbUSDC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract HBUsdcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    HBUsdcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HB_USDC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
