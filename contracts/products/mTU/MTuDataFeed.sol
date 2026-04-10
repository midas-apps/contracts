// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/DataFeed.sol";
import "./MTuMidasAccessControlRoles.sol";

/**
 * @title MTuDataFeed
 * @notice DataFeed for mTU product
 * @author RedDuck Software
 */
contract MTuDataFeed is DataFeed, MTuMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_TU_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
