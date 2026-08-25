// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./Re7YIELDMidasAccessControlRoles.sol";

/**
 * @title Re7YIELDCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for Re7YIELD,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract Re7YIELDCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    Re7YIELDMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RE7_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
