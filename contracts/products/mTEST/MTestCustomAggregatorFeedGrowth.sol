// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeedGrowth.sol";
import "./MTestMidasAccessControlRoles.sol";

/**
 * @title MTestCustomAggregatorFeedGrowth
 * @notice AggregatorV3 compatible feed for mTEST,
 * where price is submitted manually by feed admins,
 * and growth apr applies to the answer.
 * @author RedDuck Software
 */
contract MTestCustomAggregatorFeedGrowth is
    CustomAggregatorV3CompatibleFeedGrowth,
    MTestMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeedGrowth
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
