// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MArbETHMidasAccessControlRoles.sol";

/**
 * @title MArbETHDataFeed
 * @notice DataFeed for mArbETH product
 * @author RedDuck Software
 */
contract MArbETHDataFeed is DataFeed, MArbETHMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ARB_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
