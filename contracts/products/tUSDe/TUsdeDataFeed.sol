// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./TUsdeMidasAccessControlRoles.sol";

/**
 * @title TUsdeDataFeed
 * @notice DataFeed for tUSDe product
 * @author RedDuck Software
 */
contract TUsdeDataFeed is DataFeed, TUsdeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return T_USDE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
