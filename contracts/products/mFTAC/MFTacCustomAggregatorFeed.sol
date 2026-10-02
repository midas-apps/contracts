// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MFTacMidasAccessControlRoles.sol";

/**
 * @title MFTacCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mFTAC,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MFTacCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MFTacMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_FTAC_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
