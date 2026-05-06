// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./DnPumpMidasAccessControlRoles.sol";

/**
 * @title DnPumpCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for dnPUMP,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract DnPumpCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    DnPumpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_PUMP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
