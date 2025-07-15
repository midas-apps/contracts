// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./MHyperMidasAccessControlRoles.sol";

/**
 * @title MHyperDataFeed
 * @notice DataFeed for mHYPER product
 * @author RedDuck Software
 */
contract MHyperDataFeed is DataFeed, MHyperMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_HYPER_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
