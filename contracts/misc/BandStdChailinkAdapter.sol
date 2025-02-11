// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IStdReference {
    /// A structure returned whenever someone requests for standard reference data.
    struct ReferenceData {
        uint256 rate; // base/quote exchange rate, multiplied by 1e18.
        uint256 lastUpdatedBase; // UNIX epoch of the last time when base price gets updated.
        uint256 lastUpdatedQuote; // UNIX epoch of the last time when quote price gets updated.
    }

    /// Returns the price data for the given base/quote pair. Revert if not available.
    function getReferenceData(
        string memory _base,
        string memory _quote
    ) external view returns (ReferenceData memory);

    /// Similar to getReferenceData, but with multiple base/quote pairs at once.
    function getReferenceDataBulk(
        string[] memory _bases,
        string[] memory _quotes
    ) external view returns (ReferenceData[] memory);
}

/**
 * @title A port of the ChainlinkAggregatorV3 interface that supports Band`s protocol feed
 */
contract BandStdChailinkAdapter {
    IStdReference public ref;
    string public base;
    string public quote;

    constructor(address _ref, string memory _base, string memory _quote) {
        ref = IStdReference(_ref);
        base = _base;
        quote = _quote;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function description() public pure returns (string memory) {
        return "A Chainlink adapter for Band protocol";
    }

    function version() public pure returns (uint256) {
        return 1;
    }

    function latestAnswer() public view virtual returns (int256) {
        return int256(_getBandReferenceData().rate);
    }

    function latestTimestamp() public view returns (uint256) {
        return _getBandReferenceData().lastUpdatedBase;
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
     * @notice This is exactly the same as `latestRoundData`, just including for parity with Chainlink
     * Band doesn't store roundId on chain so there's no way to access old data by round id
     */
    function getRoundData(
        uint80 _roundId
    )
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
        IStdReference.ReferenceData memory value = _getBandReferenceData();

        return (
            _roundId,
            int256(value.rate),
            value.lastUpdatedBase,
            value.lastUpdatedBase,
            _roundId
        );
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
        IStdReference.ReferenceData memory value = _getBandReferenceData();

        roundId = uint80(value.lastUpdatedBase);

        return (
            roundId,
            int256(value.rate),
            value.lastUpdatedBase,
            value.lastUpdatedBase,
            roundId
        );
    }

    function _getBandReferenceData()
        private
        view
        returns (IStdReference.ReferenceData memory)
    {
        return ref.getReferenceData(base, quote);
    }
}
