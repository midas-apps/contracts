// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./Re7BTCMidasAccessControlRoles.sol";

/**
 * @title Re7BTCDataFeed
 * @notice DataFeed for Re7BTC product
 * @author RedDuck Software
 */
contract Re7BTCDataFeed is DataFeed, Re7BTCMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RE7_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
