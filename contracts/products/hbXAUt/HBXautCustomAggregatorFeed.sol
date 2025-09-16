// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./HBXautMidasAccessControlRoles.sol";

/**
 * @title HBXautCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for hbXAUt,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract HBXautCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    HBXautMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HB_XAUT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
