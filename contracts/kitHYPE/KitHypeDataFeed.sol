// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./KitHypeMidasAccessControlRoles.sol";

/**
 * @title KitHypeDataFeed
 * @notice DataFeed for kitHYPE product
 * @author RedDuck Software
 */
contract KitHypeDataFeed is DataFeed, KitHypeMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return KIT_HYPE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
