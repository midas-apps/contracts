// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MArbETHMidasAccessControlRoles.sol";

/**
 * @title MArbETHCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mArbETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MArbETHCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MArbETHMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ARB_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
