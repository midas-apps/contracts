// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./TacTonMidasAccessControlRoles.sol";

/**
 * @title TacTonDataFeed
 * @notice DataFeed for tacTON product
 * @author RedDuck Software
 */
contract TacTonDataFeed is DataFeed, TacTonMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return TAC_TON_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
