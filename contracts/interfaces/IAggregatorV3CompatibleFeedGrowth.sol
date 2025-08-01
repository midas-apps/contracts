// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title IAggregatorV3CompatibleFeedGrowth
 * @author RedDuck Software
 */
interface IAggregatorV3CompatibleFeedGrowth is AggregatorV3Interface {
    /**
     * @notice emitted when answer is updated
     *
     * @param data data value without growth applied
     * @param roundId roundId
     * @param timestamp timestamp of the data in the past
     * @param growthApr growthApr value
     */
    event AnswerUpdated(
        int256 indexed data,
        uint256 indexed roundId,
        uint256 indexed timestamp,
        int80 growthApr
    );

    /**
     * @notice emitted when max growth apr is updated
     *
     * @param newMaxGrowthApr new max growth apr
     */
    event MaxGrowthAprUpdated(int80 newMaxGrowthApr);

    /**
     * @notice emitted when min growth apr is updated

     * @param newMinGrowthApr new min growth apr
     */
    event MinGrowthAprUpdated(int80 newMinGrowthApr);

    /**
     * @notice emitted when onlyUp flag is updated
     *
     * @param newOnlyUp new onlyUp flag
     */
    event OnlyUpUpdated(bool newOnlyUp);

    /**
     * @notice updates onlyUp flag
     *
     * @param _onlyUp new onlyUp flag
     */
    function setOnlyUp(bool _onlyUp) external;

    /**
     * @notice updates max growth apr
     *
     * @param _maxGrowthApr new max growth apr
     */
    function setMaxGrowthApr(int80 _maxGrowthApr) external;

    /**
     * @notice updates min growth apr
     *
     * @param _minGrowthApr new min growth apr
     */
    function setMinGrowthApr(int80 _minGrowthApr) external;

    /**
     * @notice works as `setRoundData()`, but also checks the
     * deviation with the lattest submitted data
     * @dev deviation with previous data needs to be <= `maxAnswerDeviation`
     *
     * @param _data data value
     * @param _dataTimestamp timestamp of the data in the past
     * @param _growthApr growth apr value
     */
    function setRoundDataSafe(
        int256 _data,
        uint256 _dataTimestamp,
        int80 _growthApr
    ) external;

    /**
     * @notice sets the data for `latestRound` + 1 round id
     * @dev `_data` should be >= `minAnswer` and <= `maxAnswer`.
     * Function should be called only from permissioned actor
     *
     * @param _data data value
     * @param _dataTimestamp timestamp of the data in the past
     * @param _growthApr growth apr value
     */
    function setRoundData(
        int256 _data,
        uint256 _dataTimestamp,
        int80 _growthApr
    ) external;

    /**
     * @notice returns `latestRoundData` without growth applied
     *
     * @return roundId roundId
     * @return answer answer with growth applied
     * @return startedAt startedAt
     * @return updatedAt updatedAt
     * @return answeredInRound answeredInRound
     * @return growthApr growthApr
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
        );

    /**
     * @notice returns the growth apr of the latest round
     *
     * @return growthApr latest growthApr value
     */
    function lastGrowthApr() external view returns (int80);

    /**
     * @notice returns data for a specific round without growth applied
     *
     * @param _roundId roundId
     *
     * @return roundId roundId
     * @return answer answer with growth applied
     * @return startedAt startedAt
     * @return updatedAt updatedAt
     * @return answeredInRound answeredInRound
     * @return growthApr growthApr value
     */
    function getRoundDataRaw(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound,
            int80 growthApr
        );

    /**
     * @notice applies growth to the answer until current timestamp
     *
     * @param _answer answer
     * @param _growthApr growth apr
     * @param _timestampFrom timestamp from
     *
     * @return answer with growth applied
     */
    function applyGrowth(
        int256 _answer,
        int80 _growthApr,
        uint256 _timestampFrom
    ) external view returns (int256);

    /**
     * @notice applies growth to the answer between two timestamps
     *
     * @param _answer answer
     * @param _growthApr growth apr
     * @param _timestampFrom timestamp from
     * @param _timestampTo timestamp to
     *
     * @return answer with growth applied
     */
    function applyGrowth(
        int256 _answer,
        int80 _growthApr,
        uint256 _timestampFrom,
        uint256 _timestampTo
    ) external pure returns (int256);
}
