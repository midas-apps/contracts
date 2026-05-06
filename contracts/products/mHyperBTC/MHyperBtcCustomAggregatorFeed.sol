// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MHyperBtcMidasAccessControlRoles.sol";

/**
 * @title MHyperBtcCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mHyperBTC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MHyperBtcCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MHyperBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_HYPER_BTC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
