// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./CUsdoMidasAccessControlRoles.sol";

/**
 * @title CUsdoDataFeed
 * @notice DataFeed for cUSDO product
 * @author RedDuck Software
 */
contract CUsdoDataFeed is DataFeed, CUsdoMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return C_USDO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
