// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MGloEuroMidasAccessControlRoles.sol";

/**
 * @title MGloEuroCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mGLOeuro,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MGloEuroCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MGloEuroMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_GLO_EURO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
