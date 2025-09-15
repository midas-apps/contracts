// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeedGrowth.sol";
import "./MTBillMidasAccessControlRoles.sol";

/**
 * @title MTBillCustomAggregatorFeedGrowth
 * @notice AggregatorV3 compatible feed for mTBILL,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MTBillCustomAggregatorFeedGrowth is
    CustomAggregatorV3CompatibleFeedGrowth,
    MTBillMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeedGrowth
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_TBILL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
