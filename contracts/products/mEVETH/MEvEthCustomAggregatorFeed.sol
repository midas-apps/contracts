// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MEvEthMidasAccessControlRoles.sol";

/**
 * @title MEvEthCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mEVETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MEvEthCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MEvEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_EV_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
