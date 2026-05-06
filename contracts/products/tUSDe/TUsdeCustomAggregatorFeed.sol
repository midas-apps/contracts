// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./TUsdeMidasAccessControlRoles.sol";

/**
 * @title TUsdeCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for tUSDe,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract TUsdeCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    TUsdeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return T_USDE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
