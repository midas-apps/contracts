// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../feeds/CustomAggregatorV3CompatibleFeed.sol";
import "./MSlMidasAccessControlRoles.sol";

/**
 * @title MSlCustomAggregatorFeed
 * @notice AggregatorV3 compatible feed for mSL,
 * where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract MSlCustomAggregatorFeed is
    CustomAggregatorV3CompatibleFeed,
    MSlMidasAccessControlRoles
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
     * @notice reinitializes the contract with a new max answer deviation
     * @param _newMaxAnswerDeviation new max answer deviation
     */
    function initializeV2(uint256 _newMaxAnswerDeviation)
        public
        reinitializer(2)
    {
        require(
            _newMaxAnswerDeviation <= 100 * (10**decimals()),
            "CA: !max deviation"
        );

        maxAnswerDeviation = _newMaxAnswerDeviation;
    }

    /**
     * @inheritdoc CustomAggregatorV3CompatibleFeed
     */
    function feedAdminRole() public pure override returns (bytes32) {
        return M_SL_CUSTOM_AGGREGATOR_FEED_ADMIN_ROLE;
    }
}
