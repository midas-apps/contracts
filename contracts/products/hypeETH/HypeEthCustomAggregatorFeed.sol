// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./HypeEthMidasAccessControlRoles.sol";

/**
 * @title HypeEthCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for hypeETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract HypeEthCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    HypeEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HYPE_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
