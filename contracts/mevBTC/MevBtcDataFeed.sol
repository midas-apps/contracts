// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./MevBtcMidasAccessControlRoles.sol";

/**
 * @title MevBtcDataFeed
 * @notice DataFeed for mevBTC product
 * @author RedDuck Software
 */
contract MevBtcDataFeed is DataFeed, MevBtcMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return MEV_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
