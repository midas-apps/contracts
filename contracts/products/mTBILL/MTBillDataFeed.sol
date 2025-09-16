// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MTBillMidasAccessControlRoles.sol";

/**
 * @title MTBillDataFeed
 * @notice DataFeed for mBASIS product
 * @author RedDuck Software
 */
contract MTBillDataFeed is DataFeed, MTBillMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
