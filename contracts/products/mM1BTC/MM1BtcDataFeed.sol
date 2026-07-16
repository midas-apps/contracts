// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MM1BtcMidasAccessControlRoles.sol";

/**
 * @title MM1BtcDataFeed
 * @notice DataFeed for mM1BTC product
 * @author RedDuck Software
 */
contract MM1BtcDataFeed is DataFeed, MM1BtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_M1_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
