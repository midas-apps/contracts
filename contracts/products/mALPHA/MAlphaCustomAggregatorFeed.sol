// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MAlphaMidasAccessControlRoles.sol";

/**
 * @title MAlphaCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mALPHA,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MAlphaCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MAlphaMidasAccessControlRoles
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
        initializeV2(_minAnswer, _maxAnswer, _maxAnswerDeviation);
    }

    /**
     * @notice reinitializes the contract with new min answer, max answer
     * and max answer deviation
     * @param _newMinAnswer new min answer
     * @param _newMaxAnswer new max answer
     * @param _newMaxAnswerDeviation new max answer deviation
     */
    function initializeV2(
        int192 _newMinAnswer,
        int192 _newMaxAnswer,
        uint256 _newMaxAnswerDeviation
    ) public reinitializer(2) {
        require(_newMinAnswer < _newMaxAnswer, "CA: !min/max");
        require(
            _newMaxAnswerDeviation <= 100 * (10**decimals()),
            "CA: !max deviation"
        );

        minAnswer = _newMinAnswer;
        maxAnswer = _newMaxAnswer;
        maxAnswerDeviation = _newMaxAnswerDeviation;
    }

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_ALPHA_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
