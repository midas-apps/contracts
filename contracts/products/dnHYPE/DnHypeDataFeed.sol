// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./DnHypeMidasAccessControlRoles.sol";

/**
 * @title DnHypeDataFeed
 * @notice DataFeed for dnHYPE product
 * @author RedDuck Software
 */
contract DnHypeDataFeed is DataFeed, DnHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return DN_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
