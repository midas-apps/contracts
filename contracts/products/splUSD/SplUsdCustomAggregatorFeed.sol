// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./SplUsdMidasAccessControlRoles.sol";

/**
 * @title SplUsdCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for splUSD,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract SplUsdCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    SplUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return SPL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
