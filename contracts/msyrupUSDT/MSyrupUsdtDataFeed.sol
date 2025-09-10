// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./MSyrupUsdtMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdtDataFeed
 * @notice DataFeed for msyrupUSDT product
 * @author RedDuck Software
 */
contract MSyrupUsdtDataFeed is DataFeed, MSyrupUsdtMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_SYRUP_USDT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
