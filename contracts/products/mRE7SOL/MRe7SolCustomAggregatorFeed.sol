// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MRe7SolMidasAccessControlRoles.sol";

/**
 * @title MRe7SolCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mRE7SOL,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MRe7SolCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MRe7SolMidasAccessControlRoles
{
    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7SOL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
