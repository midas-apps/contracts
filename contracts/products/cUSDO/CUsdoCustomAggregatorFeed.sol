// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./CUsdoMidasAccessControlRoles.sol";

/**
 * @title CUsdoCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for cUSDO,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract CUsdoCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    CUsdoMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return C_USDO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
