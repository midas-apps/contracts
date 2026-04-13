// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./BondEthMidasAccessControlRoles.sol";

/**
 * @title BondEthDataFeed
 * @notice DataFeed for bondETH product
 * @author RedDuck Software
 */
contract BondEthDataFeed is DataFeed, BondEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return BOND_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
