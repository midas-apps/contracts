// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./ZeroGUsdvMidasAccessControlRoles.sol";

/**
 * @title ZeroGUsdvDataFeed
 * @notice DataFeed for zeroGUSDV product
 * @author RedDuck Software
 */
contract ZeroGUsdvDataFeed is DataFeed, ZeroGUsdvMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ZEROG_USDV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
