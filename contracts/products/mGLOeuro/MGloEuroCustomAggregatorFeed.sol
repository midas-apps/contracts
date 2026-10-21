// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MGloEuroMidasAccessControlRoles.sol";

/**
 * @title MGloEuroCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mGLOeuro,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MGloEuroCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MGloEuroMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function initialize(
        address _accessControl,
        int192 _minAnswer,
        int192 _maxAnswer,
        uint256 _maxAnswerDeviation,
        string calldata _description
    ) public override {
        super.initialize(
            _accessControl,
            _minAnswer,
            _maxAnswer,
            _maxAnswerDeviation,
            _description
        );
        // call v2 to increase contract version to 2
        initializeV2(_minAnswer, _maxAnswer);
    }

    /**
     * @notice reinitializes the contract with new min answer and max answer
     * @param _newMinAnswer new min answer
     * @param _newMaxAnswer new max answer
     */
    function initializeV2(int192 _newMinAnswer, int192 _newMaxAnswer)
        public
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
        return M_GLO_EURO_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
