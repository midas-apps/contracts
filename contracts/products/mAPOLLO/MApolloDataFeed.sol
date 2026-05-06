// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MApolloMidasAccessControlRoles.sol";

/**
 * @title MApolloDataFeed
 * @notice DataFeed for mAPOLLO product
 * @author RedDuck Software
 */
contract MApolloDataFeed is DataFeed, MApolloMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_APOLLO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
