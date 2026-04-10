// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/DataFeed.sol";
import "./MHyperBtcMidasAccessControlRoles.sol";

/**
 * @title MHyperBtcDataFeed
 * @notice DataFeed for mHyperBTC product
 * @author RedDuck Software
 */
contract MHyperBtcDataFeed is DataFeed, MHyperBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_HYPER_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
