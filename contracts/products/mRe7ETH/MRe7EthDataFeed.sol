// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MRe7EthMidasAccessControlRoles.sol";

/**
 * @title MRe7EthDataFeed
 * @notice DataFeed for mRe7ETH product
 * @author RedDuck Software
 */
contract MRe7EthDataFeed is DataFeed, MRe7EthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
