// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./WNlpMidasAccessControlRoles.sol";

/**
 * @title WNlpDataFeed
 * @notice DataFeed for wNLP product
 * @author RedDuck Software
 */
contract WNlpDataFeed is DataFeed, WNlpMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return W_NLP_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
