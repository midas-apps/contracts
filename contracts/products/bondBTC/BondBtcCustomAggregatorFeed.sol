// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./BondBtcMidasAccessControlRoles.sol";

/**
 * @title BondBtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for bondBTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract BondBtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    BondBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return BOND_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
