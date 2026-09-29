// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {DecimalsCorrectionLibrary} from "../libraries/DecimalsCorrectionLibrary.sol";
import {IDataFeed} from "../interfaces/IDataFeed.sol";

/**
 * @title DataFeed
 * @notice Wrapper of ChainLink`s AggregatorV3 data feeds
 * @author RedDuck Software
 */
contract DataFeed is WithMidasAccessControl, IDataFeed {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @param _aggregator new AggregatorV3Interface contract address
     */
    event ChangeAggregator(address indexed _aggregator);

    /**
     * @param _sequencerUptimeAggregator new AggregatorV3Interface contract address
     */
    event ChangeSequencerUptimeAggregator(
        address indexed _sequencerUptimeAggregator
    );

    /**
     * @param _healthyDiff new healthy diff value
     */
    event SetHealthyDiff(uint256 indexed _healthyDiff);

    /**
     * @param _maxExpectedAnswer new max expected answer
     * @param _minExpectedAnswer new min expected answer
     */
    event SetMinMaxExpectedAnswer(
        int256 indexed _maxExpectedAnswer,
        int256 indexed _minExpectedAnswer
    );

    /**
     * @notice sequencer uptime aggregator grace period after it becomes healthy
     */
    uint256 public constant SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD = 1 hours;

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
     * @notice AggregatorV3Interface L2 uptime aggregator contract address
     */
    AggregatorV3Interface public sequencerUptimeAggregator;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[49] private __gap;

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
     * @param _sequencerUptimeAggregator L2 sequencer uptime aggregator contract address
     */
    function initialize(
        address _ac,
        address _aggregator,
        uint256 _healthyDiff,
        int256 _minExpectedAnswer,
        int256 _maxExpectedAnswer,
        address _sequencerUptimeAggregator
    ) external {
        _initializeV1(
            _ac,
            _aggregator,
            _healthyDiff,
            _minExpectedAnswer,
            _maxExpectedAnswer
        );
        initializeV2(_sequencerUptimeAggregator);
    }

    /**
     * @dev v1 initializer
     * @param _ac MidasAccessControl contract address
     * @param _aggregator AggregatorV3Interface contract address
     * @param _healthyDiff max. staleness time for data feed answers
     * @param _minExpectedAnswer min.expected answer value from data feed
     * @param _maxExpectedAnswer max.expected answer value from data feed
     */
    function _initializeV1(
        address _ac,
        address _aggregator,
        uint256 _healthyDiff,
        int256 _minExpectedAnswer,
        int256 _maxExpectedAnswer
    ) private initializer {
        __WithMidasAccessControl_init(_ac);
        _setMinMaxExpectedAnswer(_maxExpectedAnswer, _minExpectedAnswer);

        require(_aggregator != address(0), "DF: invalid address");
        require(_healthyDiff > 0, "DF: invalid diff");

        aggregator = AggregatorV3Interface(_aggregator);

        healthyDiff = _healthyDiff;
    }

    /**
     * @dev v2 initializer
     * @param _sequencerUptimeAggregator L2 sequencer uptime aggregator contract address
     */
    function initializeV2(address _sequencerUptimeAggregator)
        public
        reinitializer(2)
        onlyProxyAdmin
    {
        sequencerUptimeAggregator = AggregatorV3Interface(
            _sequencerUptimeAggregator
        );
    }

    /**
     * @notice updates `aggregator` address
     * @param _aggregator new AggregatorV3Interface contract address
     */
    function changeAggregator(address _aggregator) external onlyContractAdmin {
        require(_aggregator != address(0), "DF: invalid address");

        aggregator = AggregatorV3Interface(_aggregator);
        emit ChangeAggregator(_aggregator);
    }

    /**
     * @notice updates `sequencerUptimeAggregator` address.
     * If zero address is provided, L2 sequencer uptime check will be skipped.
     * @param _sequencerUptimeAggregator new L2 sequencer uptime aggregator contract address
     */
    function changeSequencerUptimeAggregator(address _sequencerUptimeAggregator)
        external
        onlyContractAdmin
    {
        sequencerUptimeAggregator = AggregatorV3Interface(
            _sequencerUptimeAggregator
        );
        emit ChangeSequencerUptimeAggregator(_sequencerUptimeAggregator);
    }

    /**
     * @dev updates `healthyDiff` value
     * @param _healthyDiff new value
     */
    function setHealthyDiff(uint256 _healthyDiff) external onlyContractAdmin {
        require(_healthyDiff > 0, "DF: invalid diff");

        healthyDiff = _healthyDiff;
        emit SetHealthyDiff(_healthyDiff);
    }

    /**
     * @notice updates `minExpectedAnswer` and `maxExpectedAnswer` values
     * @param _maxExpectedAnswer new max expected answer
     * @param _minExpectedAnswer new min expected answer
     */
    function setMinMaxExpectedAnswer(
        int256 _maxExpectedAnswer,
        int256 _minExpectedAnswer
    ) external onlyContractAdmin {
        _setMinMaxExpectedAnswer(_maxExpectedAnswer, _minExpectedAnswer);
    }

    /**
     * @inheritdoc IDataFeed
     */
    function getDataInBase18() external view returns (uint256 answer) {
        (, answer) = _getDataInBase18(_validateSequencerUptime());
    }

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function contractAdminRole() public view override returns (bytes32) {
        return _CONTRACT_ADMIN_ROLE;
    }

    /**
     * @dev sets the min and max expected answer
     * @param _maxExpectedAnswer the new max expected answer
     * @param _minExpectedAnswer the new min expected answer
     */
    function _setMinMaxExpectedAnswer(
        int256 _maxExpectedAnswer,
        int256 _minExpectedAnswer
    ) private {
        require(_maxExpectedAnswer > 0, "DF: invalid max exp. price");
        require(_minExpectedAnswer > 0, "DF: invalid min exp. price");
        require(
            _maxExpectedAnswer >= _minExpectedAnswer,
            "DF: invalid exp. prices"
        );

        maxExpectedAnswer = _maxExpectedAnswer;
        minExpectedAnswer = _minExpectedAnswer;

        emit SetMinMaxExpectedAnswer(_maxExpectedAnswer, _minExpectedAnswer);
    }

    /**
     * @dev validates L2 sequencer uptime if sequencerUptimeAggregator is set
     * @return startedAt timestamp of the latest L2 uptime feed update
     */
    function _validateSequencerUptime() private view returns (uint256) {
        if (address(sequencerUptimeAggregator) == address(0)) {
            return 0;
        }

        (, int256 _answer, uint256 _startedAt, ) = _getLatestRoundData(
            sequencerUptimeAggregator
        );

        require(
            _answer == 0 &&
                _startedAt > 0 &&
                block.timestamp - _startedAt >
                SEQUENCER_UPTIME_AGGREGATOR_GRACE_PERIOD,
            "DF: sequencer is unhealthy"
        );

        return _startedAt;
    }

    /**
     * @dev fetches answer from aggregator
     * and converts it to the base18 precision
     * @param _minUpdatedAt minimum updatedAt timestamp
     * @return roundId fetched aggregator answer roundId
     * @return answer fetched aggregator answer
     */
    function _getDataInBase18(uint256 _minUpdatedAt)
        private
        view
        returns (uint80 roundId, uint256 answer)
    {
        uint8 decimals = aggregator.decimals();
        (
            uint80 _roundId,
            int256 _answer,
            ,
            uint256 updatedAt
        ) = _getLatestRoundData(aggregator);
        require(_answer > 0, "DF: feed is deprecated");
        require(
            // solhint-disable-next-line not-rely-on-time
            block.timestamp - updatedAt <= healthyDiff &&
                updatedAt >= _minUpdatedAt &&
                _answer >= minExpectedAnswer &&
                _answer <= maxExpectedAnswer,
            "DF: feed is unhealthy"
        );
        roundId = _roundId;
        answer = uint256(_answer).convertToBase18(decimals);
    }

    /**
     * @dev fetches latest round data from the aggregator
     * @param _aggregator AggregatorV3Interface contract address
     * @return _roundId fetched aggregator answer roundId
     * @return _answer fetched aggregator answer
     * @return _startedAt fetched aggregator answer startedAt
     * @return _updatedAt fetched aggregator answer updatedAt
     */
    function _getLatestRoundData(AggregatorV3Interface _aggregator)
        private
        view
        returns (
            uint80 _roundId,
            int256 _answer,
            uint256 _startedAt,
            uint256 _updatedAt
        )
    {
        (_roundId, _answer, _startedAt, _updatedAt, ) = _aggregator
            .latestRoundData();
    }
}
