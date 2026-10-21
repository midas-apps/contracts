// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./SdvUsdMidasAccessControlRoles.sol";

/**
 * @title SdvUsdDataFeed
 * @notice DataFeed for sdvUSD product
 * @author RedDuck Software
 */
contract SdvUsdDataFeed is DataFeed, SdvUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return SDV_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
