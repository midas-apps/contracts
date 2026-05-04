// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./BondUsdMidasAccessControlRoles.sol";

/**
 * @title BondUsdCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for bondUSD,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract BondUsdCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    BondUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return BOND_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
