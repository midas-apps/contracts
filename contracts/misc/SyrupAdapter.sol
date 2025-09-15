// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ISyrupToken {
    function decimals() external view returns (uint8);

    function convertToExitAssets(uint256 shares)
        external
        view
        returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for SyrupToken
 * @notice example https://etherscan.io/address/0x80ac24aa929eaf5013f6436cda2a7ba190f5cc0b
 */
contract SyrupAdapter {
    ISyrupToken public syrupToken;

    constructor(address _syrupToken) {
        syrupToken = ISyrupToken(_syrupToken);
    }

    function decimals() public view returns (uint8) {
        return syrupToken.decimals();
    }

    function description() public pure returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for Syrup tokens";
    }

    function version() public pure returns (uint256) {
        return 1;
    }

    function latestAnswer() public view virtual returns (int256) {
        return int256(syrupToken.convertToExitAssets(10**decimals()));
    }

    function latestTimestamp() public view returns (uint256) {
        // no info about last price update on chain
        return block.timestamp;
    }

    function latestRound() public view returns (uint256) {
        // use timestamp as the round id
        return latestTimestamp();
    }

    /*
     * @notice There is no way to access historical answer, so
     this will always revert
     */
    function getAnswer(uint256) public view returns (int256) {
        revert("Not implemented");
    }

    /*
     * @notice There is no way to access historical timestamp, so
     this will always revert
     */
    function getTimestamp(uint256) external view returns (uint256) {
        revert("Not implemented");
    }

    /*
     * @notice There is no way to access historical rate data, so
     this will always revert
     */
    function getRoundData(uint80)
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
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
