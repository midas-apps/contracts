// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./LstHypeMidasAccessControlRoles.sol";

/**
 * @title LstHypeCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for lstHYPE,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract LstHypeCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    LstHypeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LST_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
