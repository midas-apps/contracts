// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MAlphaMidasAccessControlRoles.sol";

/**
 * @title MAlphaDataFeed
 * @notice DataFeed for mALPHA product
 * @author RedDuck Software
 */
contract MAlphaDataFeed is DataFeed, MAlphaMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
