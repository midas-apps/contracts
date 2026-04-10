// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MTuMidasAccessControlRoles.sol";

/**
 * @title MTuCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mTU,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MTuCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MTuMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_TU_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
