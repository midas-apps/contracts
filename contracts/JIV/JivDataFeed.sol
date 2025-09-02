// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./JivMidasAccessControlRoles.sol";

/**
 * @title JivDataFeed
 * @notice DataFeed for JIV product
 * @author RedDuck Software
 */
contract JivDataFeed is DataFeed, JivMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return JIV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
