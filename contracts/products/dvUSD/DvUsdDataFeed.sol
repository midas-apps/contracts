// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./DvUsdMidasAccessControlRoles.sol";

/**
 * @title DvUsdDataFeed
 * @notice DataFeed for dvUSD product
 * @author RedDuck Software
 */
contract DvUsdDataFeed is DataFeed, DvUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
