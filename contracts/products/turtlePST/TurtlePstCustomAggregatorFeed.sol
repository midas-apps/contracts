// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./TurtlePstMidasAccessControlRoles.sol";

/**
 * @title TurtlePstCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for turtlePST,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract TurtlePstCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    TurtlePstMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return TURTLE_PST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
