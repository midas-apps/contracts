// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {MidasInitializable} from "../abstract/MidasInitializable.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";
import {DecimalsCorrectionLibrary} from "../libraries/DecimalsCorrectionLibrary.sol";
import {IDataFeed} from "../interfaces/IDataFeed.sol";

/**
 * @title CustomAggregatorV3CompatibleFeed
 * @notice AggregatorV3 compatible feed, where price is submitted manually by feed admins
 * @author RedDuck Software
 */
contract CustomAggregatorV3CompatibleFeed is
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
     * @notice contract admin role
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _CONTRACT_ADMIN_ROLE;

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

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @param data data value
     * @param roundId round id
     * @param timestamp timestamp
     */
    event AnswerUpdated(
        int256 indexed data,
        uint256 indexed roundId,
        uint256 indexed timestamp
    );

    /**
     * @param maxAnswerDeviation the new max answer deviation
     */
    event MaxAnswerDeviationUpdated(uint256 indexed maxAnswerDeviation);

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
    ) public virtual initializer {
        __WithMidasAccessControl_init(_accessControl);

        require(_minAnswer < _maxAnswer, "CA: !min/max");
        require(
            _maxAnswerDeviation <= 100 * (10**decimals()),
            "CA: !max deviation"
        );

        minAnswer = _minAnswer;
        maxAnswer = _maxAnswer;
        maxAnswerDeviation = _maxAnswerDeviation;
        description = _description;
    }

    /**
     * @notice works as `setRoundData()`, but also checks the
     * deviation with the lattest submitted data, and that at least
     * 1 hour passed since the lattest submission
     * @dev deviation with previous data needs to be <= `maxAnswerDeviation`
     * @param _data data value
     */
    function setRoundDataSafe(int256 _data) external {
        uint256 _lastUpdatedAt = lastTimestamp();

        if (_lastUpdatedAt != 0) {
            uint256 deviation = _getDeviation(lastAnswer(), _data);
            require(deviation <= maxAnswerDeviation, "CA: !deviation");
        }

        require(
            block.timestamp - _lastUpdatedAt > 1 hours,
            "CA: not enough time passed"
        );

        return setRoundData(_data);
    }

    /**
     * @notice sets the data for `latestRound` + 1 round id
     * @dev `_data` should be >= `minAnswer` and <= `maxAnswer`.
     * Function should be called only from address with `contractAdminRole()`
     * @param _data data value
     */
    function setRoundData(int256 _data) public onlyContractAdmin {
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
     * @notice sets the max answer deviation
     * @dev the max answer deviation is the maximum allowed deviation from the latest price
     * @param _maxAnswerDeviation the new max answer deviation
     */
    function setMaxAnswerDeviation(uint256 _maxAnswerDeviation)
        external
        onlyContractAdmin
    {
        require(
            _maxAnswerDeviation <= 100 * (10**decimals()),
            "CA: !max deviation"
        );
        maxAnswerDeviation = _maxAnswerDeviation;
        emit MaxAnswerDeviationUpdated(_maxAnswerDeviation);
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
     * @inheritdoc WithMidasAccessControl
     */
    function contractAdminRole() public view override returns (bytes32) {
        return _CONTRACT_ADMIN_ROLE;
    }

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
}
