// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/DataFeed.sol";
import "./MM1UsdMidasAccessControlRoles.sol";

/**
 * @title MM1UsdDataFeed
 * @notice DataFeed for mM1USD product
 * @author RedDuck Software
 */
contract MM1UsdDataFeed is DataFeed, MM1UsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_M1_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
