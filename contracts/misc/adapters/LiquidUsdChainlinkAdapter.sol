// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface ILiquidUsdOracle {
    function latestAnswer() external view returns (int256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for liquidUSD Oracle
 * @notice Adapter for liquidUSD from ether.fi for liquidDeFi deposits
 */
contract LiquidUsdChainlinkAdapter is ChainlinkAdapterBase {
    ILiquidUsdOracle public liquidUsdOracle;

    constructor(address _liquidUsdOracle) {
        liquidUsdOracle = ILiquidUsdOracle(_liquidUsdOracle);
    }

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for liquidUSD";
    }

    function latestAnswer() public view override returns (int256) {
        return liquidUsdOracle.latestAnswer();
    }
}
