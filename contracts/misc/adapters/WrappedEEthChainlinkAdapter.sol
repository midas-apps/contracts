// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IWrappedEEth {
    function getRate() external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for Wrapped EEth
 * @notice example https://etherscan.io/address/0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee
 */
contract WrappedEEthChainlinkAdapter is ChainlinkAdapterBase {
    IWrappedEEth public wrappedEEth;

    constructor(address _wrappedEEth) {
        wrappedEEth = IWrappedEEth(_wrappedEEth);
    }

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for Wrapped EEth";
    }

    function latestAnswer() public view override returns (int256) {
        return int256(wrappedEEth.getRate());
    }
}
