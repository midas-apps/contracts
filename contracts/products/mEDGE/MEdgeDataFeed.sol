// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MEdgeMidasAccessControlRoles.sol";

/**
 * @title MEdgeDataFeed
 * @notice DataFeed for mEDGE product
 * @author RedDuck Software
 */
contract MEdgeDataFeed is DataFeed, MEdgeMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_EDGE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
