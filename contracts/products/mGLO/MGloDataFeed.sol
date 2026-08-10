// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MGloMidasAccessControlRoles.sol";

/**
 * @title MGloDataFeed
 * @notice DataFeed for mGLO product
 * @author RedDuck Software
 */
contract MGloDataFeed is DataFeed, MGloMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_GLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
