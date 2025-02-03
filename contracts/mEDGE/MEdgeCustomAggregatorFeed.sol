// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MEdgeMidasAccessControlRoles.sol";

/**
 * @title MEdgeCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mEDGE,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MEdgeCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MEdgeMidasAccessControlRoles
{
    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
