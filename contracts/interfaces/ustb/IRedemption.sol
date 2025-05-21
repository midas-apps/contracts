// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IRedemption {
    error InsufficientBalance();

    function USDC() external view returns (address);

    function SUPERSTATE_TOKEN() external view returns (address);

    function calculateUstbIn(
        uint256 usdcOutAmount
    )
        external
        view
        returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw);

    function redeem(uint256 superstateTokenInAmount) external;
}
