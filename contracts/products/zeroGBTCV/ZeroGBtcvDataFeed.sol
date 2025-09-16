// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./ZeroGBtcvMidasAccessControlRoles.sol";

/**
 * @title ZeroGBtcvDataFeed
 * @notice DataFeed for zeroGBTCV product
 * @author RedDuck Software
 */
contract ZeroGBtcvDataFeed is DataFeed, ZeroGBtcvMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ZEROG_BTCV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
