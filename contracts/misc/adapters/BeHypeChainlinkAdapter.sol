// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IBeHype {
    function BeHYPEToHYPE(uint256 beHYPEAmount) external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for beHYPE
 * @notice Adapter for beHYPE LST from hyperbeat for liquidHYPE redemptions
 */
contract BeHypeChainlinkAdapter is ChainlinkAdapterBase {
    IBeHype public beHype;

    constructor(address _beHype) {
        beHype = IBeHype(_beHype);
    }

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for beHYPE";
    }

    function latestAnswer() public view override returns (int256) {
        return int256(beHype.BeHYPEToHYPE(1e18));
    }
}
