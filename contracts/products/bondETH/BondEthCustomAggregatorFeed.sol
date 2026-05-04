// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./BondEthMidasAccessControlRoles.sol";

/**
 * @title BondEthCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for bondETH,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract BondEthCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    BondEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return BOND_ETH_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
