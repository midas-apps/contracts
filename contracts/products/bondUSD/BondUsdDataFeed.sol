// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/DataFeed.sol";
import "./BondUsdMidasAccessControlRoles.sol";

/**
 * @title BondUsdDataFeed
 * @notice DataFeed for bondUSD product
 * @author RedDuck Software
 */
contract BondUsdDataFeed is DataFeed, BondUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return BOND_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
