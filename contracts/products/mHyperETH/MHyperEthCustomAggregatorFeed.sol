// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MHyperEthMidasAccessControlRoles.sol";

/**
 * @title MHyperEthCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mHyperETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MHyperEthCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MHyperEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_HYPER_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
