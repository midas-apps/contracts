// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

/**
 * @title CompositeDataFeed
 * @notice A data feed contract that derives its price by computing the ratio
 * of two underlying data feeds (numerator ÷ denominator).
 * @dev Designed for cases where a synthetic or relative price is needed,
 * such as deriving cbBTC/BTC from cbBTC/USD and BTC/USD feeds.
 * @author RedDuck Software
 */
contract CompositeDataFeed is WithMidasAccessControl, IDataFeed {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice price feed used as the numerator in the ratio calculation.
     * @dev typically represents the asset of interest (e.g., cbBTC/USD).
     */
    IDataFeed public numeratorFeed;

    /**
     * @notice price feed used as the denominator in the ratio calculation.
     * @dev typically represents the reference asset (e.g., BTC/USD).
     */
    IDataFeed public denominatorFeed;

    /**
     * @dev minimal answer expected to receive from getDataInBase18
     */
    uint256 public minExpectedAnswer;

    /**
     * @dev maximal answer expected to receive from getDataInBase18
     */
    uint256 public maxExpectedAnswer;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac MidasAccessControl contract address
     * @param _numeratorFeed numerator feed address
     * @param _denominatorFeed denominator feed address
     * @param _minExpectedAnswer min. expected answer value from data feed
     * @param _maxExpectedAnswer max. expected answer value from data feed
     */
    function initialize(
        address _ac,
        address _numeratorFeed,
        address _denominatorFeed,
        uint256 _minExpectedAnswer,
        uint256 _maxExpectedAnswer
    ) external initializer {
        require(_numeratorFeed != address(0), "CDF: invalid address");
        require(_denominatorFeed != address(0), "CDF: invalid address");
        require(
            _maxExpectedAnswer >= _minExpectedAnswer,
            "CDF: invalid exp. prices"
        );

        __WithMidasAccessControl_init(_ac);

        numeratorFeed = IDataFeed(_numeratorFeed);
        denominatorFeed = IDataFeed(_denominatorFeed);
        minExpectedAnswer = _minExpectedAnswer;
        maxExpectedAnswer = _maxExpectedAnswer;
    }

    /**
     * @notice updates `numeratorFeed` address
     * @dev can only be called by the feed admin
     * @param _numeratorFeed new numerator feed address
     */
    function changeNumeratorFeed(address _numeratorFeed)
        external
        onlyRole(feedAdminRole(), msg.sender)
    {
        require(_numeratorFeed != address(0), "CDF: invalid address");

        numeratorFeed = IDataFeed(_numeratorFeed);
    }

    /**
     * @notice updates `denominatorFeed` address
     * @dev can only be called by the feed admin
     * @param _denominatorFeed new denominator feed address
     */
    function changeDenominatorFeed(address _denominatorFeed)
        external
        onlyRole(feedAdminRole(), msg.sender)
    {
        require(_denominatorFeed != address(0), "CDF: invalid address");

        denominatorFeed = IDataFeed(_denominatorFeed);
    }

    /**
     * @dev updates `minExpectedAnswer` value
     * @param _minExpectedAnswer min value
     */
    function setMinExpectedAnswer(uint256 _minExpectedAnswer)
        external
        onlyRole(feedAdminRole(), msg.sender)
    {
        require(
            maxExpectedAnswer >= _minExpectedAnswer,
            "CDF: invalid exp. prices"
        );

        minExpectedAnswer = _minExpectedAnswer;
    }

    /**
     * @dev updates `maxExpectedAnswer` value
     * @param _maxExpectedAnswer max value
     */
    function setMaxExpectedAnswer(uint256 _maxExpectedAnswer)
        external
        onlyRole(feedAdminRole(), msg.sender)
    {
        require(
            _maxExpectedAnswer >= minExpectedAnswer,
            "CDF: invalid exp. prices"
        );

        maxExpectedAnswer = _maxExpectedAnswer;
    }

    /**
     * @dev fetches answer from numerator and denominator feeds
     * and returns calculated answer (numerator / denominator)
     * @return answer calculated answer in base18
     */
    function getDataInBase18() external view returns (uint256 answer) {
        uint256 numerator = numeratorFeed.getDataInBase18();
        uint256 denominator = denominatorFeed.getDataInBase18();

        answer = (numerator * 1e18) / denominator;

        require(
            answer >= minExpectedAnswer && answer <= maxExpectedAnswer,
            "CDF: feed is unhealthy"
        );
    }

    /**
     * @inheritdoc IDataFeed
     */
    function feedAdminRole() public pure virtual override returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
    }
}
