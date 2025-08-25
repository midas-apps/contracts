// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./KmiUsdMidasAccessControlRoles.sol";

/**
 * @title KmiUsdCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for kmiUSD,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract KmiUsdCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    KmiUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return KMI_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
