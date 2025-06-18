// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IRsEth {
    function rsETHPrice() external view returns (uint256);
}

/**
 * @title ChainlinkAggregatorV3 compatible adapter for rsETH
 * @notice example https://etherscan.io/address/0x349A73444b1a310BAe67ef67973022020d70020d
 */
contract RsEthAdapter {
    IRsEth public rsEth;

    constructor(address _rsEth) {
        rsEth = IRsEth(_rsEth);
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function description() public pure returns (string memory) {
        return "A ChainlinkAggregatorV3 compatible adapter for rsETH";
    }

    function version() public pure returns (uint256) {
        return 1;
    }

    function latestAnswer() public view virtual returns (int256) {
        return int256(rsEth.rsETHPrice());
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
    function getRoundData(
        uint80
    ) external view returns (uint80, int256, uint256, uint256, uint80) {
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
