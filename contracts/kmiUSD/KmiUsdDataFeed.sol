// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./KmiUsdMidasAccessControlRoles.sol";

/**
 * @title KmiUsdDataFeed
 * @notice DataFeed for kmiUSD product
 * @author RedDuck Software
 */
contract KmiUsdDataFeed is DataFeed, KmiUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return KMI_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
