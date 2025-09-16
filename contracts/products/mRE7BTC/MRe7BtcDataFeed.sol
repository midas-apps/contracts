// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MRe7BtcMidasAccessControlRoles.sol";

/**
 * @title MRe7BtcDataFeed
 * @notice DataFeed for mRE7BTC product
 * @author RedDuck Software
 */
contract MRe7BtcDataFeed is DataFeed, MRe7BtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
