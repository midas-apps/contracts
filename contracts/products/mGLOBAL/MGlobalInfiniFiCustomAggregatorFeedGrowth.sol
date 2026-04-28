// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeedGrowth.sol";
import "./MGlobalMidasAccessControlRoles.sol";

/**
 * @title MGlobalInfiniFiCustomAggregatorFeedGrowth
 * @notice AggregatorV3 compatible feed for mGLOBAL dedicated to the InfiniFi
 * integration, where price is submitted manually by feed admins,
 * and growth apr applies to the answer.
 * @author RedDuck Software
 */
contract MGlobalInfiniFiCustomAggregatorFeedGrowth is
    CustomAggregatorV3CompatibleFeedGrowth,
    MGlobalMidasAccessControlRoles
{
    /**
     * @notice feed admin for this InfiniFi oracle only — not shared with core mGLOBAL role mixins.
     */
    bytes32 public constant INFINIFI_MG_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE =
        keccak256("INFINIFI_MG_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeedGrowth
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return INFINIFI_MG_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
