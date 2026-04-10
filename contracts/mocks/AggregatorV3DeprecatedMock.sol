// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "../access/WithMidasAccessControl.sol";
import "../libraries/DecimalsCorrectionLibrary.sol";
import "../interfaces/IDataFeed.sol";

contract AggregatorV3DeprecatedMock is AggregatorV3Interface {
    int256 private _latestRoundData;
    uint80 private _latestRoundId;

    function decimals() external view returns (uint8) {
        return 8;
    }

    function description() external view returns (string memory) {}

    function version() external view returns (uint256) {}

    function setRoundData(int256 _data) external {
        _latestRoundData = _data;
        _latestRoundId++;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {}

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
        // solhint-disable-next-line not-rely-on-time
        return (_latestRoundId, -1, 0, block.timestamp, 0);
    }
}
