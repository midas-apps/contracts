// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/DataFeed.sol";
import "./MSyrupUsdMidasAccessControlRoles.sol";

/**
 * @title MSyrupUsdDataFeed
 * @notice DataFeed for msyrupUSD product
 * @author RedDuck Software
 */
contract MSyrupUsdDataFeed is DataFeed, MSyrupUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_SYRUP_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
