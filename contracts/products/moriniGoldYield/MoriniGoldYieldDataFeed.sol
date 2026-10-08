// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MoriniGoldYieldMidasAccessControlRoles.sol";

/**
 * @title MoriniGoldYieldDataFeed
 * @notice DataFeed for moriniGoldYield product
 * @author RedDuck Software
 */
contract MoriniGoldYieldDataFeed is
    DataFeed,
    MoriniGoldYieldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return MORINI_GOLD_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
