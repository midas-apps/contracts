// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MEvEthMidasAccessControlRoles.sol";

/**
 * @title MEvEthDataFeed
 * @notice DataFeed for mEVETH product
 * @author RedDuck Software
 */
contract MEvEthDataFeed is DataFeed, MEvEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_EV_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
