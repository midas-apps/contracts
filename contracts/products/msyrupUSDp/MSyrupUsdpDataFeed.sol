// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MSyrupUsdpMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdpDataFeed
 * @notice DataFeed for msyrupUSDp product
 * @author RedDuck Software
 */
contract MSyrupUsdpDataFeed is DataFeed, MSyrupUsdpMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_SYRUP_USDP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
