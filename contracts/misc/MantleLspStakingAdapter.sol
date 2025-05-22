// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IMantleLspStaking {
    function mETHToETH(uint256 mETHAmount) external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for Mantle LSP Staking
 * @notice example https://etherscan.io/address/0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f
 */
contract MantleLspStakingAdapter {
    IMantleLspStaking public lspStaking;

    constructor(address _lspStaking) {
        lspStaking = IMantleLspStaking(_lspStaking);
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function description() public pure returns (string memory) {
        return
            "A ChainlinkAggregatorV3 compatible adapter for Mantle LSP Staking";
    }

    function version() public pure returns (uint256) {
        return 1;
    }

    function latestAnswer() public view virtual returns (int256) {
        return int256(lspStaking.mETHToETH(1e18));
    }

    function latestTimestamp() public view returns (uint256) {
        // no info about last price update on chain
        return block.timestamp;
    }

    function latestRound() public view returns (uint256) {
        // use timestamp as the round id
        return latestTimestamp();
    }

    function getAnswer(uint256) public view returns (int256) {
        return latestAnswer();
    }

    function getTimestamp(uint256) external view returns (uint256) {
        return latestTimestamp();
    }

    /*
     * @notice There is no way to access historical rate data, so
     this will always revert
     */
    function getRoundData(uint80)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        revert("Not implemented");
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            uint80(latestTimestamp()),
            latestAnswer(),
            latestTimestamp(),
            latestTimestamp(),
            uint80(latestTimestamp())
        );
    }
}
