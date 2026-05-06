// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./HypeEthMidasAccessControlRoles.sol";

/**
 * @title HypeEthDataFeed
 * @notice DataFeed for hypeETH product
 * @author RedDuck Software
 */
contract HypeEthDataFeed is DataFeed, HypeEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HYPE_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
