// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MKRalphaMidasAccessControlRoles.sol";

/**
 * @title MKRalphaCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mKRalpha,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MKRalphaCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MKRalphaMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_KRALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
