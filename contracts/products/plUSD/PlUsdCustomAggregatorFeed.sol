// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./PlUsdMidasAccessControlRoles.sol";

/**
 * @title PlUsdCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for plUSD,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract PlUsdCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    PlUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return PL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
