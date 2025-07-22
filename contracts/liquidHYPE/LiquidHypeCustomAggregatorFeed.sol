// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./LiquidHypeMidasAccessControlRoles.sol";

/**
 * @title LiquidHypeCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for liquidHYPE,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract LiquidHypeCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    LiquidHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
