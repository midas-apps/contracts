// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./PlUsdMidasAccessControlRoles.sol";

/**
 * @title PlUsdDataFeed
 * @notice DataFeed for plUSD product
 * @author RedDuck Software
 */
contract PlUsdDataFeed is DataFeed, PlUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return PL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
