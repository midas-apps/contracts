// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./WeEurMidasAccessControlRoles.sol";

/**
 * @title WeEurDataFeed
 * @notice DataFeed for weEUR product
 * @author RedDuck Software
 */
contract WeEurDataFeed is DataFeed, WeEurMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return WE_EUR_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
