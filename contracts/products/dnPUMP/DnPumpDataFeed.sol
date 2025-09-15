// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./DnPumpMidasAccessControlRoles.sol";

/**
 * @title DnPumpDataFeed
 * @notice DataFeed for dnPUMP product
 * @author RedDuck Software
 */
contract DnPumpDataFeed is DataFeed, DnPumpMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_PUMP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
