// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./LiquidRwaMidasAccessControlRoles.sol";

/**
 * @title LiquidRwaDataFeed
 * @notice DataFeed for liquidRWA product
 * @author RedDuck Software
 */
contract LiquidRwaDataFeed is DataFeed, LiquidRwaMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_RWA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
