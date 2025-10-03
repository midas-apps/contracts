// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./ObeatUsdMidasAccessControlRoles.sol";

/**
 * @title ObeatUsdDataFeed
 * @notice DataFeed for obeatUSD product
 * @author RedDuck Software
 */
contract ObeatUsdDataFeed is DataFeed, ObeatUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return OBEAT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
