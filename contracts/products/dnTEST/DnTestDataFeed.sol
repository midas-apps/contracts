// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./DnTestMidasAccessControlRoles.sol";

/**
 * @title DnTestDataFeed
 * @notice DataFeed for dnTEST product
 * @author RedDuck Software
 */
contract DnTestDataFeed is DataFeed, DnTestMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_TEST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
