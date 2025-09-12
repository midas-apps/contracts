// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title Base contract for ChainlinkAggregatorV3 compatible adapters
 */
abstract contract ChainlinkAdapterBase is AggregatorV3Interface {
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    function description() external pure virtual returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter";
    }

    function version() external view virtual returns (uint256) {
        return 1;
    }

    function latestTimestamp() public view virtual returns (uint256) {
        // no info about last price update on chain
        return block.timestamp;
    }

    function latestRound() public view virtual returns (uint256) {
        // use timestamp as the round id
        return latestTimestamp();
    }

    function latestAnswer() public view virtual returns (int256);

    function getAnswer(uint256) public pure virtual returns (int256) {
        revert("CAB: not implemented");
    }

    function getTimestamp(uint256) external pure virtual returns (uint256) {
        revert("CAB: not implemented");
    }

    /*
     * @notice There is no way to access historical rate data, so
     * this will always revert
     */
    function getRoundData(uint80)
        external
        view
        virtual
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        revert("CAB: not implemented");
    }

    function latestRoundData()
        external
        view
        virtual
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            uint80(latestTimestamp()),
            latestAnswer(),
            latestTimestamp(),
            latestTimestamp(),
            uint80(latestTimestamp())
        );
    }
}
