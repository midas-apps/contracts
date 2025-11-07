// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MRe7MidasAccessControlRoles.sol";

/**
 * @title MRe7DataFeed
 * @notice DataFeed for mRE7 product
 * @author RedDuck Software
 */
contract MRe7DataFeed is DataFeed, MRe7MidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
