// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MWinMidasAccessControlRoles.sol";

/**
 * @title MWinDataFeed
 * @notice DataFeed for mWIN product
 * @author RedDuck Software
 */
contract MWinDataFeed is DataFeed, MWinMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_WIN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
