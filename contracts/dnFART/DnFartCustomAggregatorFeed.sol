// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./DnFartMidasAccessControlRoles.sol";

/**
 * @title DnFartCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for dnFART,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract DnFartCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    DnFartMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_FART_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
