// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./DnEthMidasAccessControlRoles.sol";

/**
 * @title DnEthDataFeed
 * @notice DataFeed for dnETH product
 * @author RedDuck Software
 */
contract DnEthDataFeed is DataFeed, DnEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
