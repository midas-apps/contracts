// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./HypeBtcMidasAccessControlRoles.sol";

/**
 * @title HypeBtcDataFeed
 * @notice DataFeed for hypeBTC product
 * @author RedDuck Software
 */
contract HypeBtcDataFeed is DataFeed, HypeBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HYPE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
