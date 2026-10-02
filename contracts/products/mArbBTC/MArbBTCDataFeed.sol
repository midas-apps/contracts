// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MArbBTCMidasAccessControlRoles.sol";

/**
 * @title MArbBTCDataFeed
 * @notice DataFeed for mArbBTC product
 * @author RedDuck Software
 */
contract MArbBTCDataFeed is DataFeed, MArbBTCMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ARB_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
