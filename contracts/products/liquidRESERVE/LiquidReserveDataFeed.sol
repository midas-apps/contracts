// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./LiquidReserveMidasAccessControlRoles.sol";

/**
 * @title LiquidReserveDataFeed
 * @notice DataFeed for liquidRESERVE product
 * @author RedDuck Software
 */
contract LiquidReserveDataFeed is
    DataFeed,
    LiquidReserveMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return LIQUID_RESERVE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
