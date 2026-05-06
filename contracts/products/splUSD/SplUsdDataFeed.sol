// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./SplUsdMidasAccessControlRoles.sol";

/**
 * @title SplUsdDataFeed
 * @notice DataFeed for splUSD product
 * @author RedDuck Software
 */
contract SplUsdDataFeed is DataFeed, SplUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return SPL_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
