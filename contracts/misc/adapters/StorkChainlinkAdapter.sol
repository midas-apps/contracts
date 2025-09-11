// SPDX-License-Identifier: Apache 2

pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IStorkTemporalNumericValueUnsafeGetter {
    function getTemporalNumericValueUnsafeV1(
        bytes32 id
    ) external view returns (StorkStructs.TemporalNumericValue memory value);
}

contract StorkStructs {
    struct TemporalNumericValue {
        // slot 1
        // nanosecond level precision timestamp of latest publisher update in batch
        uint64 timestampNs; // 8 bytes
        // should be able to hold all necessary numbers (up to 6277101735386680763835789423207666416102355444464034512895)
        int192 quantizedValue; // 8 bytes
    }
}

/**
 * @title A port of the ChainlinkAggregatorV3 interface that supports Stork price feeds
 */
contract StorkChainlinkAdapter is ChainlinkAdapterBase {
    uint256 public constant TIMESTAMP_DIVIDER = 1_000_000_000;

    bytes32 public priceId;
    IStorkTemporalNumericValueUnsafeGetter public stork;

    constructor(address _stork, bytes32 _priceId) {
        priceId = _priceId;
        stork = IStorkTemporalNumericValueUnsafeGetter(_stork);
    }

    function description() external pure override returns (string memory) {
        return "A port of a chainlink aggregator powered by Stork";
    }

    function latestAnswer() public view override returns (int256) {
        return stork.getTemporalNumericValueUnsafeV1(priceId).quantizedValue;
    }

    function latestTimestamp() public view override returns (uint256) {
        return
            stork.getTemporalNumericValueUnsafeV1(priceId).timestampNs /
            TIMESTAMP_DIVIDER;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        StorkStructs.TemporalNumericValue memory value = stork
            .getTemporalNumericValueUnsafeV1(priceId);
        roundId = uint80(value.timestampNs);
        return (
            roundId,
            value.quantizedValue,
            value.timestampNs / TIMESTAMP_DIVIDER,
            value.timestampNs / TIMESTAMP_DIVIDER,
            roundId
        );
    }
}
