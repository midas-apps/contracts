// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MMevMidasAccessControlRoles.sol";

/**
 * @title MMevCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mMEV,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MMevCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MMevMidasAccessControlRoles
{
    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
