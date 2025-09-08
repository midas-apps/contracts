// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./KitUsdMidasAccessControlRoles.sol";

/**
 * @title KitUsdDataFeed
 * @notice DataFeed for kitUSD product
 * @author RedDuck Software
 */
contract KitUsdDataFeed is DataFeed, KitUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return KIT_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
