// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./DnFartMidasAccessControlRoles.sol";

/**
 * @title DnFartDataFeed
 * @notice DataFeed for dnFART product
 * @author RedDuck Software
 */
contract DnFartDataFeed is DataFeed, DnFartMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_FART_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
