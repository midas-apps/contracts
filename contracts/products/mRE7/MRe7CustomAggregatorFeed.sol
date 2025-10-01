// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MRe7MidasAccessControlRoles.sol";

/**
 * @title MRe7CustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mRE7,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MRe7CustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MRe7MidasAccessControlRoles
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
        initializeV2(_maxAnswerDeviation);
    }

    /**
     * @notice initializes the contract with a new max answer deviation
     * @dev increases contract version to 2
     * @param _newMaxAnswerDeviation new max answer deviation
     */
    function initializeV2(
        uint256 _newMaxAnswerDeviation
    ) public reinitializer(2) {
        require(
            _newMaxAnswerDeviation <= 100 * (10 ** decimals()),
            "CA: !max deviation"
        );

        maxAnswerDeviation = _newMaxAnswerDeviation;
    }

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_RE7_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
