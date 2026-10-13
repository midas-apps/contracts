// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MoriniBTCYieldMidasAccessControlRoles.sol";

/**
 * @title MoriniBTCYieldDataFeed
 * @notice DataFeed for moriniBTCYield product
 * @author RedDuck Software
 */
contract MoriniBTCYieldDataFeed is
    DataFeed,
    MoriniBTCYieldMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return MORINI_BTC_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
