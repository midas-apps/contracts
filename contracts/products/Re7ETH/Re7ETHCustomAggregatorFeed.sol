// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./Re7ETHMidasAccessControlRoles.sol";

/**
 * @title Re7ETHCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for Re7ETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract Re7ETHCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    Re7ETHMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RE7_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
