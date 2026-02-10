// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MRoxMidasAccessControlRoles.sol";

/**
 * @title MRoxCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mROX,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MRoxCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MRoxMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ROX_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
