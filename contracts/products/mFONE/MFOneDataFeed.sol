// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MFOneMidasAccessControlRoles.sol";

/**
 * @title MFOneDataFeed
 * @notice DataFeed for mF-ONE product
 * @author RedDuck Software
 */
contract MFOneDataFeed is DataFeed, MFOneMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
