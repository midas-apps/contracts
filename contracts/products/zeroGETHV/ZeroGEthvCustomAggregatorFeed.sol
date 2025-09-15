// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./ZeroGEthvMidasAccessControlRoles.sol";

/**
 * @title ZeroGEthvCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for zeroGETHV,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract ZeroGEthvCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    ZeroGEthvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ZEROG_ETHV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
