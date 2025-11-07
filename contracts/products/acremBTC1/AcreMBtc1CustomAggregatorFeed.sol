// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./AcreMBtc1MidasAccessControlRoles.sol";

/**
 * @title AcreMBtc1CustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for acremBTC1,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract AcreMBtc1CustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    AcreMBtc1MidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return ACRE_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
