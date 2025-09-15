// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MFarmMidasAccessControlRoles.sol";

/**
 * @title MFarmDataFeed
 * @notice DataFeed for mFARM product
 * @author RedDuck Software
 */
contract MFarmDataFeed is DataFeed, MFarmMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_FARM_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
