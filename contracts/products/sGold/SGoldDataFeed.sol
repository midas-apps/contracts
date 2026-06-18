// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./SGoldMidasAccessControlRoles.sol";

/**
 * @title SGoldDataFeed
 * @notice DataFeed for sGold product
 * @author RedDuck Software
 */
contract SGoldDataFeed is DataFeed, SGoldMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return S_GOLD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
