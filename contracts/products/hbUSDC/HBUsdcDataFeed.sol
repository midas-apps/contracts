// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./HBUsdcMidasAccessControlRoles.sol";

/**
 * @title HBUsdcDataFeed
 * @notice DataFeed for hbUSDC product
 * @author RedDuck Software
 */
contract HBUsdcDataFeed is DataFeed, HBUsdcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HB_USDC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
