// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./Re7YIELDMidasAccessControlRoles.sol";

/**
 * @title Re7YIELDDataFeed
 * @notice DataFeed for Re7YIELD product
 * @author RedDuck Software
 */
contract Re7YIELDDataFeed is DataFeed, Re7YIELDMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RE7_YIELD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
