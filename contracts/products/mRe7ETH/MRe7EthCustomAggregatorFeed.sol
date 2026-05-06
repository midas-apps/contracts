// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MRe7EthMidasAccessControlRoles.sol";

/**
 * @title MRe7EthCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mRe7ETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MRe7EthCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MRe7EthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
