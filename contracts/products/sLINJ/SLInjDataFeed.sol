// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./SLInjMidasAccessControlRoles.sol";

/**
 * @title SLInjDataFeed
 * @notice DataFeed for sLINJ product
 * @author RedDuck Software
 */
contract SLInjDataFeed is DataFeed, SLInjMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return SL_INJ_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
