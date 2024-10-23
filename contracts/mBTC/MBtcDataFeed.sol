// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./MBtcMidasAccessControlRoles.sol";

/**
 * @title MBtcDataFeed
 * @notice DataFeed for mBTC product
 * @author RedDuck Software
 */
contract MBtcDataFeed is DataFeed, MBtcMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
