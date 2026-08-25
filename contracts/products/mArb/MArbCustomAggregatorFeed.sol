// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MArbMidasAccessControlRoles.sol";

/**
 * @title MArbCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mArb,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MArbCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MArbMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ARB_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
