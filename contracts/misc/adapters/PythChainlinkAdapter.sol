// SPDX-License-Identifier: Apache 2

pragma solidity 0.8.9;

import "@pythnetwork/pyth-sdk-solidity/PythAggregatorV3.sol";

/**
 * @title A port of the ChainlinkAggregatorV3 interface that supports Pyth price feeds
 */
contract PythChainlinkAdapter is PythAggregatorV3 {
    constructor(address _pyth, bytes32 _priceId)
        PythAggregatorV3(_pyth, _priceId)
    {}
}
