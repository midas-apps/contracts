// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MGloEuroMidasAccessControlRoles.sol";

/**
 * @title MGloEuroDataFeed
 * @notice DataFeed for mGLOeuro product
 * @author RedDuck Software
 */
contract MGloEuroDataFeed is DataFeed, MGloEuroMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_GLO_EURO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
