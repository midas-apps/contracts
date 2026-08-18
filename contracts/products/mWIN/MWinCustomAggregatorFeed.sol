// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MWinMidasAccessControlRoles.sol";

/**
 * @title MWinCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mWIN,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MWinCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MWinMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice reinitialize the feed with new min and max answer
     * @param _newMinAnswer The new min answer
     * @param _newMaxAnswer The new max answer
     */
    function initializeV2(int192 _newMinAnswer, int192 _newMaxAnswer)
        external
        reinitializer(2)
    {
        require(_newMinAnswer < _newMaxAnswer, "CA: !min/max");

        minAnswer = _newMinAnswer;
        maxAnswer = _newMaxAnswer;
    }

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_WIN_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
