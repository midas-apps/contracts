// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IRsEth {
    function rsETHPrice() external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for rsETH
 * @notice example https://etherscan.io/address/0x349A73444b1a310BAe67ef67973022020d70020d
 */
contract RsEthChainlinkAdapter is ChainlinkAdapterBase {
    IRsEth public rsEth;

    constructor(address _rsEth) {
        rsEth = IRsEth(_rsEth);
    }

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for rsETH";
    }

    function latestAnswer() public view override returns (int256) {
        return int256(rsEth.rsETHPrice());
    }
}
