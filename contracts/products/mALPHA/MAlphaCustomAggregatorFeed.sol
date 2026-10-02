// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MAlphaMidasAccessControlRoles.sol";

/**
 * @title MAlphaCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mALPHA,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MAlphaCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MAlphaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
