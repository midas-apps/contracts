// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

/**
 * @title CustomAggregatorV3CompatibleFeed
 * @notice AggregatorV3 compatible feed, where price is submitted manually by feed admins
 * @author RedDuck Software
 */
abstract contract CustomAggregatorV3CompatibleFeed is
    WithMidasAccessControl,
    AggregatorV3Interface
{
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    /**
     * @notice feed description
     */
    string public override description;

    /**
     * @notice last round id
     */
    uint80 public latestRound;

    /**
     * @notice max deviation from lattest price in %
     * @dev 10 ** decimals() is a percentage precision
     */
    uint256 public maxAnswerDeviation;

    /**
     * @notice minimal possible answer that feed can return
     */
    int192 public minAnswer;

    /**
     * @notice maximal possible answer that feed can return
     */
    int192 public maxAnswer;

    /**
     * @dev holds round information
     */
    mapping(uint80 => RoundData) private _roundData;

    event AnswerUpdated(
        int256 indexed data,
        uint256 indexed roundId,
        uint256 indexed timestamp
    );

    event MaxAnswerDeviationUpdated(uint256 indexed maxAnswerDeviation);

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
     * @param _description init value for `description`
     */
    function initialize(
        address _accessControl,
        int192 _minAnswer,
        int192 _maxAnswer,
        uint256 _maxAnswerDeviation,
        string calldata _description
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);

        require(_minAnswer < _maxAnswer, "CA: !min/max");
        _validateMaxAnswerDeviation(_maxAnswerDeviation);

        minAnswer = _minAnswer;
        maxAnswer = _maxAnswer;
        maxAnswerDeviation = _maxAnswerDeviation;
        description = _description;
    }

    /**
     * @notice sets the max deviation for the feed
     * @param _maxAnswerDeviation max deviation in `10 ** decimals()` precision
     */
    function setMaxAnswerDeviation(uint256 _maxAnswerDeviation)
        external
        onlyAggregatorAdmin
    {
        _validateMaxAnswerDeviation(_maxAnswerDeviation);
        maxAnswerDeviation = _maxAnswerDeviation;
        emit MaxAnswerDeviationUpdated(_maxAnswerDeviation);
    }

    /**
     * @notice works as `setRoundData()`, but also checks the
     * deviation with the lattest submitted data
     * @dev deviation with previous data needs to be <= `maxAnswerDeviation`
     * @param _data data value
     */
    function setRoundDataSafe(int256 _data) external {
        if (lastTimestamp() != 0) {
            uint256 deviation = _getDeviation(lastAnswer(), _data);
            require(deviation <= maxAnswerDeviation, "CA: !deviation");
        }

        return setRoundData(_data);
    }

    /**
     * @notice sets the data for `latestRound` + 1 round id
     * @dev `_data` should be >= `minAnswer` and <= `maxAnswer`.
     * Function should be called only from address with `feedAdminRole()`
     * @param _data data value
     */
    function setRoundData(int256 _data) public onlyAggregatorAdmin {
        require(
            _data >= minAnswer && _data <= maxAnswer,
            "CA: out of [min;max]"
        );

        uint80 roundId = latestRound + 1;

        _roundData[roundId] = RoundData({
            roundId: roundId,
            answer: _data,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: roundId
        });

        latestRound = roundId;

        emit AnswerUpdated(_data, roundId, block.timestamp);
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
        return getRoundData(latestRound);
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
        return _roundData[latestRound].answer;
    }

    /**
     * @return timestamp of lattest price submission
     */
    function lastTimestamp() public view returns (uint256) {
        return _roundData[latestRound].updatedAt;
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
        RoundData memory roundData = _roundData[_roundId];
        return (
            roundData.roundId,
            roundData.answer,
            roundData.startedAt,
            roundData.updatedAt,
            roundData.answeredInRound
        );
    }

    /**
     * @dev describes a role, owner of which can update prices in this feed
     * @return role descriptor
     */
    function feedAdminRole() public view virtual returns (bytes32);

    /**
     * @inheritdoc AggregatorV3Interface
     */
    function decimals() public pure returns (uint8) {
        return 8;
    }

    /**
     * @dev calculates a deviation in % between `_lastPrice` and `_newPrice`
     * @return deviation in `10 ** decimals()` precision
     */
    function _getDeviation(int256 _lastPrice, int256 _newPrice)
        internal
        pure
        returns (uint256)
    {
        if (_newPrice == 0) return 100 * 10**decimals();
        int256 one = int256(10**decimals());
        int256 priceDif = _newPrice - _lastPrice;
        int256 deviation = (priceDif * one * 100) / _lastPrice;
        deviation = deviation < 0 ? deviation * -1 : deviation;
        return uint256(deviation);
    }

    function _validateMaxAnswerDeviation(uint256 _maxAnswerDeviation)
        private
        pure
    {
        require(
            _maxAnswerDeviation <= 100 * (10**decimals()),
            "CA: !max deviation"
        );
    }
}
