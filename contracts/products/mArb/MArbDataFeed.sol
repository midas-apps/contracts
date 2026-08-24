// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MArbMidasAccessControlRoles.sol";

/**
 * @title MArbDataFeed
 * @notice DataFeed for mArb product
 * @author RedDuck Software
 */
contract MArbDataFeed is DataFeed, MArbMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ARB_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
