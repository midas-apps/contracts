// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

/**
 * @title CustomAggregatorV3CompatibleFeedDiscounted
 * @notice AggregatorV3 compatible proxy-feed that discounts the price
 * of an underlying chainlink compatible feed by a given percentage
 * @author RedDuck Software
 */
contract CustomAggregatorV3CompatibleFeedDiscounted is
    AggregatorV3Interface,
    WithMidasAccessControl
{
    /**
     * @notice the underlying chainlink compatible feed
     */
    AggregatorV3Interface public underlyingFeed;

    /**
     * @notice the discount percentage. Expressed in 10 ** decimals() precision
     * Example: 10 ** decimals() = 1%
     */
    uint256 public discountPercentage;

    function initialize(
        address _accessControl,
        address _underlyingFeed,
        uint256 _discountPercentage
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);
        require(_underlyingFeed != address(0), "CAD: !underlying feed");
        require(
            _discountPercentage <= 100 * (10 ** decimals()),
            "CAD: !discount percentage"
        );

        underlyingFeed = AggregatorV3Interface(_underlyingFeed);
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
    function getRoundData(
        uint80 _roundId
    )
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
     * @dev describes a role, owner of which can manage this feed
     * @return role descriptor
     */
    function feedAdminRole() public view virtual returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
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
    function _calculateDiscountedAnswer(
        int256 _answer
    ) internal view returns (int256) {
        require(_answer >= 0, "CAD: !_answer");

        int256 discount = (_answer * int256(discountPercentage)) /
            int256(100 * 10 ** decimals());

        return _answer - discount;
    }
}
