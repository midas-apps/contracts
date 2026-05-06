// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MMevMidasAccessControlRoles.sol";

/**
 * @title MMevDataFeed
 * @notice DataFeed for mMEV product
 * @author RedDuck Software
 */
contract MMevDataFeed is DataFeed, MMevMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_MEV_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
