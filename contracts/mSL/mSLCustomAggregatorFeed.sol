// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MSlMidasAccessControlRoles.sol";

/**
 * @title MSlCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mSL,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MSlCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MSlMidasAccessControlRoles
{
    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
