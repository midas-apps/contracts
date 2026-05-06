// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MBasisMidasAccessControlRoles.sol";

/**
 * @title MBasisDataFeed
 * @notice DataFeed for mBASIS product
 * @author RedDuck Software
 */
contract MBasisDataFeed is DataFeed, MBasisMidasAccessControlRoles {
    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_BASIS_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
