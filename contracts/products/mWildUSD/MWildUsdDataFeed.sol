// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MWildUsdMidasAccessControlRoles.sol";

/**
 * @title MWildUsdDataFeed
 * @notice DataFeed for mWildUSD product
 * @author RedDuck Software
 */
contract MWildUsdDataFeed is DataFeed, MWildUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_WILD_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
