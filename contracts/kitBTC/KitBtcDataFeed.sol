// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./KitBtcMidasAccessControlRoles.sol";

/**
 * @title KitBtcDataFeed
 * @notice DataFeed for kitBTC product
 * @author RedDuck Software
 */
contract KitBtcDataFeed is DataFeed, KitBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return KIT_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
