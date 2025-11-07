// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MPortofinoMidasAccessControlRoles.sol";

/**
 * @title MPortofinoCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mPortofino,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MPortofinoCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MPortofinoMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_PORTOFINO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
