// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./QHVNMidasAccessControlRoles.sol";

/**
 * @title QHVNCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for qHVN,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract QHVNCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    QHVNMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return Q_HVN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
