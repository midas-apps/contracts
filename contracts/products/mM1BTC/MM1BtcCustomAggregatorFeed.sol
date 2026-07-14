// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MM1BtcMidasAccessControlRoles.sol";

/**
 * @title MM1BtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mM1BTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MM1BtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MM1BtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_M1_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
