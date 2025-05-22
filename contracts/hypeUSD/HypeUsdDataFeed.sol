// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/DataFeed.sol";
import "./HypeUsdMidasAccessControlRoles.sol";

/**
 * @title HypeUsdDataFeed
 * @notice DataFeed for hypeUSD product
 * @author RedDuck Software
 */
contract HypeUsdDataFeed is DataFeed, HypeUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return HYPE_USD_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
