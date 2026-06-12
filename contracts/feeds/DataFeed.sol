// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {MidasInitializable} from "../abstract/MidasInitializable.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

/**
 * @title DataFeed
 * @notice Wrapper of ChainLink`s AggregatorV3 data feeds
 * @author RedDuck Software
 */
contract DataFeed is WithMidasAccessControl, IDataFeed {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice contract admin role
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _CONTRACT_ADMIN_ROLE;

    /**
     * @notice AggregatorV3Interface contract address
     */
    AggregatorV3Interface public aggregator;

    /**
     * @dev healty difference between `block.timestamp` and `updatedAt` timestamps
     */
    uint256 public healthyDiff;

    /**
     * @dev minimal answer expected to receive from the `aggregator`
     */
    int256 public minExpectedAnswer;

    /**
     * @dev maximal answer expected to receive from the `aggregator`
     */
    int256 public maxExpectedAnswer;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev having a second gap here to match with the gap of previous implementations
     */
    uint256[50] private ___gap;

    /**
     * @notice constructor
     * @param _contractAdminRole contract admin role
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole) MidasInitializable() {
        _CONTRACT_ADMIN_ROLE = _contractAdminRole;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac MidasAccessControl contract address
     * @param _aggregator AggregatorV3Interface contract address
     * @param _healthyDiff max. staleness time for data feed answers
     * @param _minExpectedAnswer min.expected answer value from data feed
     * @param _maxExpectedAnswer max.expected answer value from data feed
     */
    function initialize(
        address _ac,
        address _aggregator,
        uint256 _healthyDiff,
        int256 _minExpectedAnswer,
        int256 _maxExpectedAnswer
    ) external initializer {
        require(_aggregator != address(0), "DF: invalid address");
        require(_healthyDiff > 0, "DF: invalid diff");
        require(_minExpectedAnswer > 0, "DF: invalid min exp. price");
        require(_maxExpectedAnswer > 0, "DF: invalid max exp. price");
        require(
            _maxExpectedAnswer > _minExpectedAnswer,
            "DF: invalid exp. prices"
        );

        __WithMidasAccessControl_init(_ac);
        aggregator = AggregatorV3Interface(_aggregator);

        healthyDiff = _healthyDiff;
        minExpectedAnswer = _minExpectedAnswer;
        maxExpectedAnswer = _maxExpectedAnswer;
    }

    /**
     * @notice updates `aggregator` address
     * @param _aggregator new AggregatorV3Interface contract address
     */
    function changeAggregator(address _aggregator) external onlyContractAdmin {
        require(_aggregator != address(0), "DF: invalid address");

        aggregator = AggregatorV3Interface(_aggregator);
    }

    /**
     * @dev updates `healthyDiff` value
     * @param _healthyDiff new value
     */
    function setHealthyDiff(uint256 _healthyDiff) external onlyContractAdmin {
        require(_healthyDiff > 0, "DF: invalid diff");

        healthyDiff = _healthyDiff;
    }

    /**
     * @dev updates `minExpectedAnswer` value
     * @param _minExpectedAnswer min value
     */
    function setMinExpectedAnswer(int256 _minExpectedAnswer)
        external
        onlyContractAdmin
    {
        require(_minExpectedAnswer > 0, "DF: invalid min exp. price");
        require(
            maxExpectedAnswer > _minExpectedAnswer,
            "DF: invalid exp. prices"
        );

        minExpectedAnswer = _minExpectedAnswer;
    }

    /**
     * @dev updates `maxExpectedAnswer` value
     * @param _maxExpectedAnswer max value
     */
    function setMaxExpectedAnswer(int256 _maxExpectedAnswer)
        external
        onlyContractAdmin
    {
        require(_maxExpectedAnswer > 0, "DF: invalid max exp. price");
        require(
            _maxExpectedAnswer > minExpectedAnswer,
            "DF: invalid exp. prices"
        );

        maxExpectedAnswer = _maxExpectedAnswer;
    }

    /**
     * @inheritdoc IDataFeed
     */
    function getDataInBase18() external view returns (uint256 answer) {
        (, answer) = _getDataInBase18();
    }

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function contractAdminRole() public view override returns (bytes32) {
        return _CONTRACT_ADMIN_ROLE;
    }

    /**
     * @dev fetches answer from aggregator
     * and converts it to the base18 precision
     * @return roundId fetched aggregator answer roundId
     * @return answer fetched aggregator answer
     */
    function _getDataInBase18()
        private
        view
        returns (uint80 roundId, uint256 answer)
    {
        uint8 decimals = aggregator.decimals();
        (uint80 _roundId, int256 _answer, , uint256 updatedAt, ) = aggregator
            .latestRoundData();
        require(_answer > 0, "DF: feed is deprecated");
        require(
            // solhint-disable-next-line not-rely-on-time
            block.timestamp - updatedAt <= healthyDiff &&
                _answer >= minExpectedAnswer &&
                _answer <= maxExpectedAnswer,
            "DF: feed is unhealthy"
        );
        roundId = _roundId;
        answer = uint256(_answer).convertToBase18(decimals);
    }
}
