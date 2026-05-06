// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MEvUsdMidasAccessControlRoles.sol";

/**
 * @title MEvUsdDataFeed
 * @notice DataFeed for mEVUSD product
 * @author RedDuck Software
 */
contract MEvUsdDataFeed is DataFeed, MEvUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_EV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
