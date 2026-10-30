// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./LiquidDefiMidasAccessControlRoles.sol";

/**
 * @title LiquidDefiCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for liquidDeFi,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract LiquidDefiCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    LiquidDefiMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_DEFI_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
