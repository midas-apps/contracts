// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IYInjOracle {
    function getExchangeRate() external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for yINJ Oracle
 * @notice Adapter for yINJ from injective for sLINJ redemptions
 */
contract YInjChainlinkAdapter is ChainlinkAdapterBase {
    IYInjOracle public yInj;

    constructor(address _yINJ) {
        yInj = IYInjOracle(_yINJ);
    }

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for yINJ";
    }

    function latestAnswer() public view override returns (int256) {
        return int256(yInj.getExchangeRate());
    }
}
