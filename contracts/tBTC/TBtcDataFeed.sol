// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./TBtcMidasAccessControlRoles.sol";

/**
 * @title TBtcDataFeed
 * @notice DataFeed for tBTC product
 * @author RedDuck Software
 */
contract TBtcDataFeed is DataFeed, TBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return T_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
