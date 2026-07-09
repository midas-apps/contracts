// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MRe7MidasAccessControlRoles.sol";

/**
 * @title MRe7CustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mRE7,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 * @dev last initialization version is 3
 */
contract MRe7CustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MRe7MidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
