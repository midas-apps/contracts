// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./LiquidDefiMidasAccessControlRoles.sol";

/**
 * @title LiquidDefiDataFeed
 * @notice DataFeed for liquidDeFi product
 * @author RedDuck Software
 */
contract LiquidDefiDataFeed is DataFeed, LiquidDefiMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_DEFI_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
