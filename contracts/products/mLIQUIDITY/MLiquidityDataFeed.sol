// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/DataFeed.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityDataFeed
 * @notice DataFeed for mLIQUIDITY product
 * @author RedDuck Software
 */
contract MLiquidityDataFeed is DataFeed, MLiquidityMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc DataFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_LIQUIDITY_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
