// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IWstEth {
    function stEthPerToken() external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for wstETH
 * @notice example https://etherscan.io/address/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0
 */
contract WstEthChainlinkAdapter is ChainlinkAdapterBase {
    IWstEth public wstEth;

    constructor(address _wstEth) {
        wstEth = IWstEth(_wstEth);
    }

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for wstETH";
    }

    function latestAnswer() public view override returns (int256) {
        return int256(wstEth.stEthPerToken());
    }
}
