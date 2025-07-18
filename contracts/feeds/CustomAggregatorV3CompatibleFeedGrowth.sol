// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../interfaces/IAggregatorV3CompatibleFeedGrowth.sol";

/**
 * @title CustomAggregatorV3CompatibleFeedGrowth
 * @notice AggregatorV3 compatible feed, where price is submitted manually by feed admins
 * and growth apr % is applied to the answer.
 * @author RedDuck Software
 */
contract CustomAggregatorV3CompatibleFeedGrowth is
    WithMidasAccessControl,
    IAggregatorV3CompatibleFeedGrowth
{
    struct RoundDataWithGrowth {
        uint80 roundId;
        uint80 answeredInRound;
        int80 growthApr;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
    }

    /**
     * @dev decimals of the aggregator
     */
    uint8 private constant _DECIMALS = 8;

    /**
     * @dev 1 with `_DECIMALS` precision
     */
    uint256 private constant _ONE = 10**_DECIMALS;

    /**
     * @notice feed description
     */
    string public override description;

    /**
     * @notice max deviation from lattest price in %
     * @dev 10 ** decimals() is a percentage precision
     */
    uint256 public maxAnswerDeviation;

    /**
     * @notice last timestamp when setRoundData or setRoundDataSafe were called
     */
    uint256 public lastUpdatedAt;

    /**
     * @notice minimal possible answer that feed can return
     */
    int192 public minAnswer;

    /**
     * @notice maximal possible answer that feed can return
     */
    int192 public maxAnswer;

    /**
     * @notice minimal possible growth apr value that can be set
     */
    int80 public minGrowthApr;

    /**
     * @notice maximal possible growth apr value that can be set
     */
    int80 public maxGrowthApr;

    /**
     * @notice last round id
     */
    uint80 public latestRound;

    /**
     * @notice if true, the price
     */
    bool public onlyUp;

    /**
     * @dev holds round information
     */
    mapping(uint80 => RoundDataWithGrowth) private _roundData;

    /**
     * @dev checks that msg.sender do have a feedAdminRole() role
     */
    modifier onlyAggregatorAdmin() {
        _onlyRole(feedAdminRole(), msg.sender);
        _;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     * @param _minAnswer init value for `minAnswer`. Should be < `_maxAnswer`
     * @param _maxAnswer init value for `maxAnswer`. Should be > `_minAnswer`
     * @param _maxAnswerDeviation init value for `maxAnswerDeviation`
     * @param _minGrowthApr init value for `minGrowthApr`
     * @param _maxGrowthApr init value for `maxGrowthApr`
     * @param _onlyUp init value for `onlyUp`
     * @param _description init value for `description`
     */
    function initialize(
        address _accessControl,
        int192 _minAnswer,
        int192 _maxAnswer,
        uint256 _maxAnswerDeviation,
        int80 _minGrowthApr,
        int80 _maxGrowthApr,
        bool _onlyUp,
        string calldata _description
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);

        require(_minAnswer < _maxAnswer, "CAG: !min/max");
        require(_minGrowthApr <= _maxGrowthApr, "CAG: !min/max growth");

        require(_maxAnswerDeviation <= 100 * _ONE, "CAG: !max deviation");

        minAnswer = _minAnswer;
        maxAnswer = _maxAnswer;
        maxAnswerDeviation = _maxAnswerDeviation;
        minGrowthApr = _minGrowthApr;
        maxGrowthApr = _maxGrowthApr;
        description = _description;
        onlyUp = _onlyUp;
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function setOnlyUp(bool _onlyUp) external override onlyAggregatorAdmin {
        onlyUp = _onlyUp;
        emit OnlyUpUpdated(_onlyUp);
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function setMaxGrowthApr(int80 _maxGrowthApr)
        external
        override
        onlyAggregatorAdmin
    {
        require(_maxGrowthApr >= minGrowthApr, "CAG: !max growth");
        maxGrowthApr = _maxGrowthApr;
        emit MaxGrowthAprUpdated(_maxGrowthApr);
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function setMinGrowthApr(int80 _minGrowthApr)
        external
        override
        onlyAggregatorAdmin
    {
        require(_minGrowthApr <= maxGrowthApr, "CAG: !min growth");
        minGrowthApr = _minGrowthApr;
        emit MinGrowthAprUpdated(_minGrowthApr);
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function setRoundDataSafe(
        int256 _data,
        uint256 _dataTimestamp,
        int80 _growthApr
    ) external {
        bool _onlyUp = onlyUp;

        uint256 _lastUpdatedAt = lastUpdatedAt;

        if (_lastUpdatedAt != 0) {
            uint256 deviation = _getDeviation(
                lastAnswer(),
                applyGrowth(_data, _growthApr, _dataTimestamp),
                _onlyUp
            );
            require(deviation <= maxAnswerDeviation, "CAG: !deviation");
        }

        if (_onlyUp) {
            require(_growthApr >= 0, "CAG: negative apr");
        }

        require(
            block.timestamp - _lastUpdatedAt > 1 hours,
            "CAG: not enough time passed"
        );

        return setRoundData(_data, _dataTimestamp, _growthApr);
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function setRoundData(
        int256 _data,
        uint256 _dataTimestamp,
        int80 _growthApr
    ) public onlyAggregatorAdmin {
        require(
            _data >= minAnswer && _data <= maxAnswer,
            "CAG: out of [min;max]"
        );

        require(
            _growthApr >= minGrowthApr && _growthApr <= maxGrowthApr,
            "CAG: out of [min;max] growth"
        );

        require(
            _dataTimestamp > lastTimestamp() &&
                _dataTimestamp < block.timestamp,
            "CAG: invalid timestamp"
        );

        uint80 roundId = latestRound + 1;

        _roundData[roundId] = RoundDataWithGrowth({
            roundId: roundId,
            answer: _data,
            startedAt: _dataTimestamp,
            updatedAt: _dataTimestamp,
            answeredInRound: roundId,
            growthApr: _growthApr
        });

        latestRound = roundId;

        lastUpdatedAt = block.timestamp;

        emit AnswerUpdated(_data, roundId, _dataTimestamp, _growthApr);
    }

    /**
     * @notice returns data for latest round with growth applied
     *
     * @return roundId roundId
     * @return answer answer with growth applied
     * @return startedAt startedAt
     * @return updatedAt updatedAt
     * @return answeredInRound answeredInRound
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
        return getRoundData(latestRound);
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function latestRoundDataRaw()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound,
            int80 growthApr
        )
    {
        return getRoundDataRaw(latestRound);
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function version() external pure returns (uint256) {
        return 1;
    }

    /**
     * @return answer of lattest price submission
     */
    function lastAnswer() public view returns (int256) {
        return
            applyGrowth(
                _roundData[latestRound].answer,
                lastGrowthApr(),
                lastTimestamp()
            );
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function lastGrowthApr() public view returns (int80) {
        return _roundData[latestRound].growthApr;
    }

    /**
     * @return timestamp of lattest price submission
     */
    function lastTimestamp() public view returns (uint256) {
        return _roundData[latestRound].updatedAt;
    }

    /**
     * @notice returns data for a specific round with growth applied
     * @dev growth to answer is only applied between [roundTimestamp,nextRoundTimestamp]
     * or if roundId is latestRound, block.timestamp will be used as nextRoundTimestamp
     *
     * @param _roundId roundId
     *
     * @return roundId roundId
     * @return answer answer with growth applied
     * @return startedAt startedAt
     * @return updatedAt updatedAt
     * @return answeredInRound answeredInRound
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
        RoundDataWithGrowth memory roundData = _roundData[_roundId];
        bool isLatestRound = _roundId == latestRound;

        return (
            roundData.roundId,
            applyGrowth(
                roundData.answer,
                roundData.growthApr,
                roundData.updatedAt,
                isLatestRound
                    ? block.timestamp
                    : _roundData[_roundId + 1].updatedAt
            ),
            roundData.startedAt,
            roundData.updatedAt,
            roundData.answeredInRound
        );
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function getRoundDataRaw(uint80 _roundId)
        public
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound,
            int80 growthApr
        )
    {
        RoundDataWithGrowth memory roundData = _roundData[_roundId];
        return (
            roundData.roundId,
            roundData.answer,
            roundData.startedAt,
            roundData.updatedAt,
            roundData.answeredInRound,
            roundData.growthApr
        );
    }

    /**
     * @dev describes a role, owner of which can update prices in this feed
     * @return role descriptor
     */
    function feedAdminRole() public view virtual returns (bytes32) {
        return DEFAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function applyGrowth(
        int256 _answer,
        int80 _growthApr,
        uint256 _timestampFrom
    ) public view returns (int256) {
        return
            applyGrowth(_answer, _growthApr, _timestampFrom, block.timestamp);
    }

    /**
     * @inheritdoc IAggregatorV3CompatibleFeedGrowth
     */
    function applyGrowth(
        int256 _answer,
        int80 _growthApr,
        uint256 _timestampFrom,
        uint256 _timestampTo
    ) public pure returns (int256) {
        int256 passedSeconds = int256(_timestampTo - _timestampFrom);
        int256 interest = (_answer * passedSeconds * _growthApr) /
            int256(100 * _ONE * 365 days);

        return _answer + interest;
    }

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function decimals() public pure returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev calculates a deviation in % between `_lastPrice` and `_newPrice`
     *
     * @param _lastPrice last price
     * @param _newPrice new price
     * @param _validateOnlyUp if true, will validate that deviation is positive
     *
     * @return deviation in `decimals()` precision
     */
    function _getDeviation(
        int256 _lastPrice,
        int256 _newPrice,
        bool _validateOnlyUp
    ) internal pure returns (uint256) {
        if (_newPrice == 0) return 100 * _ONE;
        int256 one = int256(_ONE);
        int256 priceDif = _newPrice - _lastPrice;
        int256 deviation = (priceDif * one * 100) / _lastPrice;

        if (_validateOnlyUp) {
            require(deviation >= 0, "CAG: deviation is negative");
        }

        deviation = deviation < 0 ? deviation * -1 : deviation;
        return uint256(deviation);
    }
}
