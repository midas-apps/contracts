// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./RadYcMidasAccessControlRoles.sol";

/**
 * @title RadYcDataFeed
 * @notice DataFeed for radYC product
 * @author RedDuck Software
 */
contract RadYcDataFeed is DataFeed, RadYcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RAD_YC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
