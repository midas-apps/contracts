// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./WNlpMidasAccessControlRoles.sol";

/**
 * @title WNlpCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for wNLP,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract WNlpCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    WNlpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return W_NLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
