// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./TurtlePstMidasAccessControlRoles.sol";

/**
 * @title TurtlePstDataFeed
 * @notice DataFeed for turtlePST product
 * @author RedDuck Software
 */
contract TurtlePstDataFeed is DataFeed, TurtlePstMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return TURTLE_PST_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
