// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/CustomAggregatorV3CompatibleFeedGrowth.sol";
import "./MGlobalMidasAccessControlRoles.sol";

/**
 * @title MGlobalCustomAggregatorFeedGrowth
 * @notice AggregatorV3 compatible feed for mGLOBAL,
 * where price is submitted manually by feed admins,
 * and growth apr applies to the answer.
 * @author RedDuck Software
 */
contract MGlobalCustomAggregatorFeedGrowth is
    CustomAggregatorV3CompatibleFeedGrowth,
    MGlobalMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeedGrowth
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_GLOBAL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
