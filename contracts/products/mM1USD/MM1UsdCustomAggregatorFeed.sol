// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MM1UsdMidasAccessControlRoles.sol";

/**
 * @title MM1UsdCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mM1USD,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MM1UsdCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MM1UsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_M1_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
