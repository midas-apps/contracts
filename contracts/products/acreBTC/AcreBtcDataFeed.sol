// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./AcreBtcMidasAccessControlRoles.sol";

/**
 * @title AcreBtcDataFeed
 * @notice DataFeed for acreBTC product
 * @author RedDuck Software
 */
contract AcreBtcDataFeed is DataFeed, AcreBtcMidasAccessControlRoles {
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
