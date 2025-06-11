// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./HBXautMidasAccessControlRoles.sol";

/**
 * @title HBXautDataFeed
 * @notice DataFeed for hbXAUt product
 * @author RedDuck Software
 */
contract HBXautDataFeed is DataFeed, HBXautMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HB_XAUT_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
