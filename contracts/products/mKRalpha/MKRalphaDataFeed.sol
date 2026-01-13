// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MKRalphaMidasAccessControlRoles.sol";

/**
 * @title MKRalphaDataFeed
 * @notice DataFeed for mKRalpha product
 * @author RedDuck Software
 */
contract MKRalphaDataFeed is DataFeed, MKRalphaMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_KRALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
