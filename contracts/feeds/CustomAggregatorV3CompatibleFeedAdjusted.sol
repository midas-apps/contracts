// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title CustomAggregatorV3CompatibleFeedAdjusted
 * @notice AggregatorV3 compatible proxy-feed that adjusts the price
 * of an underlying chainlink compatible feed by a given signed percentage.
 * Positive adjustmentPercentage raises the reported price.
 * Negative adjustmentPercentage lowers the reported price.
 * @author RedDuck Software
 */
contract CustomAggregatorV3CompatibleFeedAdjusted is AggregatorV3Interface {
    /**
     * @notice the underlying chainlink compatible feed
     */
    AggregatorV3Interface public immutable underlyingFeed;

    /**
     * @notice the adjustment percentage (signed).
     * Expressed in 10 ** decimals() precision.
     * Example: 10 ** decimals() = 1%, -(10 ** decimals()) = -1%
     * Positive values raise the reported price.
     * Negative values lower the reported price.
     */
    int256 public immutable adjustmentPercentage;

    /**
     * @notice constructor
     * @param _underlyingFeed the underlying chainlink compatible feed
     * @param _adjustmentPercentage signed adjustment percentage in 10 ** decimals() precision
     */
    constructor(address _underlyingFeed, int256 _adjustmentPercentage) {
        require(_underlyingFeed != address(0), "CAA: !underlying feed");
        underlyingFeed = AggregatorV3Interface(_underlyingFeed);

        int256 maxPct = int256(100 * (10**decimals()));
        require(
            _adjustmentPercentage >= -maxPct && _adjustmentPercentage <= maxPct,
            "CAA: invalid adjustment"
        );

        adjustmentPercentage = _adjustmentPercentage;
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        (
            roundId,
            answer,
            startedAt,
            updatedAt,
            answeredInRound
        ) = underlyingFeed.latestRoundData();

        answer = _calculateAdjustedAnswer(answer);
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function version() external view returns (uint256) {
        return underlyingFeed.version();
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function getRoundData(uint80 _roundId)
        public
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        (
            roundId,
            answer,
            startedAt,
            updatedAt,
            answeredInRound
        ) = underlyingFeed.getRoundData(_roundId);
        answer = _calculateAdjustedAnswer(answer);
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function decimals() public view returns (uint8) {
        return underlyingFeed.decimals();
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function description() public view returns (string memory) {
        if (adjustmentPercentage == 0) return underlyingFeed.description();
        string memory suffix = adjustmentPercentage > 0
            ? " PriceRaised"
            : " PriceLowered";
        return string(abi.encodePacked(underlyingFeed.description(), suffix));
    }

    /**
     * @dev calculates the adjusted answer
     * @param _answer the answer to adjust
     * @return the adjusted answer
     */
    function _calculateAdjustedAnswer(int256 _answer)
        internal
        view
        returns (int256)
    {
        require(_answer >= 0, "CAA: !_answer");

        int256 adjustment = (_answer * adjustmentPercentage) /
            int256(100 * 10**decimals());

        return _answer + adjustment;
    }
}
