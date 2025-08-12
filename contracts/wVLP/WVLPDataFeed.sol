// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./WVLPMidasAccessControlRoles.sol";

/**
 * @title WVLPDataFeed
 * @notice DataFeed for wVLP product
 * @author RedDuck Software
 */
contract WVLPDataFeed is DataFeed, WVLPMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return W_VLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
