// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IUSTBRedemption {
    function SUPERSTATE_TOKEN() external view returns (address);

    function USDC() external view returns (address);

    function owner() external view returns (address);

    function redeem(uint256 superstateTokenInAmount) external;

    function setRedemptionFee(uint256 _newFee) external;

    function calculateFee(uint256 amount) external view returns (uint256);

    function calculateUstbIn(uint256 usdcOutAmount)
        external
        view
        returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw);
}
