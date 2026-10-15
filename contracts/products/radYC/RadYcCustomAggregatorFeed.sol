// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./RadYcMidasAccessControlRoles.sol";

/**
 * @title RadYcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for radYC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract RadYcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    RadYcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RAD_YC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
