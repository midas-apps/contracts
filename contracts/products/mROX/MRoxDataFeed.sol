// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MRoxMidasAccessControlRoles.sol";

/**
 * @title MRoxDataFeed
 * @notice DataFeed for mROX product
 * @author RedDuck Software
 */
contract MRoxDataFeed is DataFeed, MRoxMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ROX_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
