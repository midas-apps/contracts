// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./Re7ETHMidasAccessControlRoles.sol";

/**
 * @title Re7ETHDataFeed
 * @notice DataFeed for Re7ETH product
 * @author RedDuck Software
 */
contract Re7ETHDataFeed is DataFeed, Re7ETHMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RE7_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
