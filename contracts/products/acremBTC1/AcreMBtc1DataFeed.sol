// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./AcreMBtc1MidasAccessControlRoles.sol";

/**
 * @title AcreMBtc1DataFeed
 * @notice DataFeed for acremBTC1 product
 * @author RedDuck Software
 */
contract AcreMBtc1DataFeed is DataFeed, AcreMBtc1MidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
