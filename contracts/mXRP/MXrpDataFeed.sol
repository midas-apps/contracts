// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./MXrpMidasAccessControlRoles.sol";

/**
 * @title MXrpDataFeed
 * @notice DataFeed for mXRP product
 * @author RedDuck Software
 */
contract MXrpDataFeed is DataFeed, MXrpMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_XRP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
