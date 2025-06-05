// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title CustomAggregatorV3CompatibleFeedDiscounted
 * @notice AggregatorV3 compatible proxy-feed that discounts the price
 * of an underlying chainlink compatible feed by a given percentage
 * @author RedDuck Software
 */
contract CustomAggregatorV3CompatibleFeedDiscounted is AggregatorV3Interface {
    /**
     * @notice the underlying chainlink compatible feed
     */
    AggregatorV3Interface public immutable underlyingFeed;

    /**
     * @notice the discount percentage. Expressed in 10 ** decimals() precision
     * Example: 10 ** decimals() = 1%
     */
    uint256 public immutable discountPercentage;

    /**
     * @notice constructor
     * @param _underlyingFeed the underlying chainlink compatible feed
     * @param _discountPercentage the discount percentage. Expressed in 10 ** decimals() precision
     */
    constructor(address _underlyingFeed, uint256 _discountPercentage) {
        require(_underlyingFeed != address(0), "CAD: !underlying feed");
        underlyingFeed = AggregatorV3Interface(_underlyingFeed);

        require(
            _discountPercentage <= 100 * (10**decimals()),
            "CAD: !discount percentage"
        );

        discountPercentage = _discountPercentage;
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

        answer = _calculateDiscountedAnswer(answer);
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
        answer = _calculateDiscountedAnswer(answer);
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
        return
            string(
                abi.encodePacked(underlyingFeed.description(), " Discounted")
            );
    }

    /**
     * @dev calculates the discounted answer
     * @param _answer the answer to discount
     * @return the discounted answer
     */
    function _calculateDiscountedAnswer(int256 _answer)
        internal
        view
        returns (int256)
    {
        require(_answer >= 0, "CAD: !_answer");

        int256 discount = (_answer * int256(discountPercentage)) /
            int256(100 * 10**decimals());

        return _answer - discount;
    }
}
