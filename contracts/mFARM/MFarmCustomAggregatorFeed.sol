// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MFarmMidasAccessControlRoles.sol";

/**
 * @title MFarmCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mFARM,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MFarmCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MFarmMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_FARM_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
