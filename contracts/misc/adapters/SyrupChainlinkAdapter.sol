// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ERC4626ChainlinkAdapter.sol";

interface ISyrupToken {
    function convertToExitAssets(uint256 shares)
        external
        view
        returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for SyrupToken
 * @notice example https://etherscan.io/address/0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b
 */
contract SyrupChainlinkAdapter is ERC4626ChainlinkAdapter {
    constructor(address _syrupToken) ERC4626ChainlinkAdapter(_syrupToken) {}

    function description() external pure override returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for Syrup tokens";
    }

    function latestAnswer() public view override returns (int256) {
        return
            int256(ISyrupToken(vault).convertToExitAssets(10**vaultDecimals()));
    }
}
