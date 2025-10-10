// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MHyperEthMidasAccessControlRoles.sol";

/**
 * @title MHyperEthDataFeed
 * @notice DataFeed for mHyperETH product
 * @author RedDuck Software
 */
contract MHyperEthDataFeed is DataFeed, MHyperEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_HYPER_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
