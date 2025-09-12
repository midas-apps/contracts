// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./ChainlinkAdapterBase.sol";

interface IMantleLspStaking {
    function mETHToETH(uint256 mETHAmount) external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for Mantle LSP Staking
 * @notice example https://etherscan.io/address/0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f
 */
contract MantleLspStakingChainlinkAdapter is ChainlinkAdapterBase {
    IMantleLspStaking public lspStaking;

    constructor(address _lspStaking) {
        lspStaking = IMantleLspStaking(_lspStaking);
    }

    function description() external pure override returns (string memory) {
        return
            "A ChainlinkAggregatorV3 compatible adapter for Mantle LSP Staking";
    }

    function latestAnswer() public view override returns (int256) {
        return int256(lspStaking.mETHToETH(1e18));
    }
}
