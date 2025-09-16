// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MSlMidasAccessControlRoles.sol";

/**
 * @title MSlDataFeed
 * @notice DataFeed for mSL product
 * @author RedDuck Software
 */
contract MSlDataFeed is DataFeed, MSlMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
