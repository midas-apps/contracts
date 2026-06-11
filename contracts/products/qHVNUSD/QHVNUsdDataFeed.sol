// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./QHVNUsdMidasAccessControlRoles.sol";

/**
 * @title QHVNUsdDataFeed
 * @notice DataFeed for qHVNUSD product
 * @author RedDuck Software
 */
contract QHVNUsdDataFeed is DataFeed, QHVNUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return Q_HVN_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
