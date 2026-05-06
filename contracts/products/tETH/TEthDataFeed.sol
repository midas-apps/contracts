// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./TEthMidasAccessControlRoles.sol";

/**
 * @title TEthDataFeed
 * @notice DataFeed for tETH product
 * @author RedDuck Software
 */
contract TEthDataFeed is DataFeed, TEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return T_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
