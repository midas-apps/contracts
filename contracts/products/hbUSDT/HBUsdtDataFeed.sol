// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/DataFeed.sol";
import "./HBUsdtMidasAccessControlRoles.sol";

/**
 * @title HBUsdtDataFeed
 * @notice DataFeed for hbUSDT product
 * @author RedDuck Software
 */
contract HBUsdtDataFeed is DataFeed, HBUsdtMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HB_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
