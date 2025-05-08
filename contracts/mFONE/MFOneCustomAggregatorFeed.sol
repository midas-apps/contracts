// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MFOneMidasAccessControlRoles.sol";

/**
 * @title MFOneCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mF-ONE,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MFOneCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MFOneMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_FONE_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
