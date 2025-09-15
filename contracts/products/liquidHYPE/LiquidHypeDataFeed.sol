// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./LiquidHypeMidasAccessControlRoles.sol";

/**
 * @title LiquidHypeDataFeed
 * @notice DataFeed for liquidHYPE product
 * @author RedDuck Software
 */
contract LiquidHypeDataFeed is DataFeed, LiquidHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
