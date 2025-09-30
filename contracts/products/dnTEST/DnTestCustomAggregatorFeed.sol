// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./DnTestMidasAccessControlRoles.sol";

/**
 * @title DnTestCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for dnTEST,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract DnTestCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    DnTestMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
