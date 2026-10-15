// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./RadUsdMidasAccessControlRoles.sol";

/**
 * @title RadUsdDataFeed
 * @notice DataFeed for radUSD product
 * @author RedDuck Software
 */
contract RadUsdDataFeed is DataFeed, RadUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return RAD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
