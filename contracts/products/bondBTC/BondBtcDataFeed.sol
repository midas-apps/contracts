// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./BondBtcMidasAccessControlRoles.sol";

/**
 * @title BondBtcDataFeed
 * @notice DataFeed for bondBTC product
 * @author RedDuck Software
 */
contract BondBtcDataFeed is DataFeed, BondBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return BOND_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
