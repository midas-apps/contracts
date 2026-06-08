// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./QHVNMidasAccessControlRoles.sol";

/**
 * @title QHVNDataFeed
 * @notice DataFeed for qHVN product
 * @author RedDuck Software
 */
contract QHVNDataFeed is DataFeed, QHVNMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return Q_HVN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
