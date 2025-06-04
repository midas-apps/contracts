// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeedDiscounted.sol";
import "./MFOneMidasAccessControlRoles.sol";

/**
 * @title MFOneCustomAggregatorFeedDiscounted
 * @notice AggregatorV3 compatible feed for mF-ONE,
 * that applies a discount to the price of the underlying feed
 * @author RedDuck Software
 */
contract MFOneCustomAggregatorFeedDiscounted is
    CustomAggregatorV3CompatibleFeedDiscounted,
    MFOneMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeedDiscounted
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
