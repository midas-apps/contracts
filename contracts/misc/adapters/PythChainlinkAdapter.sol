// SPDX-License-Identifier: Apache 2

pragma solidity 0.8.9;

import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";

import "./ChainlinkAdapterBase.sol";

/**
 * @title A port of the ChainlinkAggregatorV3 interface that supports Pyth price feeds
 */
contract PythChainlinkAdapter is ChainlinkAdapterBase {
    bytes32 public priceId;
    IPyth public pyth;

    constructor(address _pyth, bytes32 _priceId) {
        priceId = _priceId;
        pyth = IPyth(_pyth);
    }

    // Wrapper function to update the underlying Pyth price feeds. Not part of the AggregatorV3 interface but useful.
    function updateFeeds(bytes[] calldata priceUpdateData) public payable {
        // Update the prices to the latest available values and pay the required fee for it. The `priceUpdateData` data
        // should be retrieved from our off-chain Price Service API using the `hermes-client` package.
        // See section "How Pyth Works on EVM Chains" below for more information.
        uint fee = pyth.getUpdateFee(priceUpdateData);
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);

        // refund remaining eth
        payable(msg.sender).call{value: address(this).balance}("");
    }

    function decimals() public view virtual override returns (uint8) {
        PythStructs.Price memory price = pyth.getPriceUnsafe(priceId);
        return uint8(-1 * int8(price.expo));
    }

    function description() external pure override returns (string memory) {
        return "A port of a chainlink aggregator powered by pyth network feeds";
    }

    function latestAnswer() public view virtual override returns (int256) {
        PythStructs.Price memory price = pyth.getPriceUnsafe(priceId);
        return int256(price.price);
    }

    function latestTimestamp() public view override returns (uint256) {
        PythStructs.Price memory price = pyth.getPriceUnsafe(priceId);
        return price.publishTime;
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
        PythStructs.Price memory price = pyth.getPriceUnsafe(priceId);
        uint256 timestamp = price.publishTime;
        return (
            uint80(timestamp),
            int256(price.price),
            timestamp,
            timestamp,
            uint80(timestamp)
        );
    }
}
