// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IUSTBRedemption {
    function SUPERSTATE_TOKEN() external view returns (address);

    function USDC() external view returns (address);

    function redeem(uint256 superstateTokenInAmount) external;

    function calculateUstbIn(uint256 usdcOutAmount)
        external
        view
        returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw);
}
