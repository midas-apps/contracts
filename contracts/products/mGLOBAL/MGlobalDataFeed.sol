// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MGlobalMidasAccessControlRoles.sol";

/**
 * @title MGlobalDataFeed
 * @notice DataFeed for mGLOBAL product
 * @author RedDuck Software
 */
contract MGlobalDataFeed is DataFeed, MGlobalMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_GLOBAL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
