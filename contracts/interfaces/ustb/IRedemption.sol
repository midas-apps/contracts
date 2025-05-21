// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IRedemption {
    function USDC() external view returns (address);

    function SUPERSTATE_TOKEN() external view returns (address);

    error InsufficientBalance();

    function getChainlinkPrice()
        external
        view
        returns (bool _isBadData, uint256 _updatedAt, uint256 _price);

    function calculateUsdcOut(
        uint256 superstateTokenInAmount
    )
        external
        view
        returns (uint256 usdcOutAmount, uint256 usdPerUstbChainlinkRaw);

    function calculateUstbIn(
        uint256 usdcOutAmount
    )
        external
        view
        returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw);

    function calculateFee(uint256 amount) external view returns (uint256);

    function maxUstbRedemptionAmount()
        external
        view
        returns (uint256 superstateTokenAmount, uint256 usdPerUstbChainlinkRaw);

    function maximumOracleDelay() external view returns (uint256);

    function sweepDestination() external view returns (address);

    function redemptionFee() external view returns (uint256);

    function pause() external;

    function redeem(address to, uint256 superstateTokenInAmount) external;

    function redeem(uint256 superstateTokenInAmount) external;

    function setMaximumOracleDelay(uint256 _newMaxOracleDelay) external;

    function setSweepDestination(address _newSweepDestination) external;

    function setRedemptionFee(uint256 _newFee) external;

    function unpause() external;

    function withdraw(address _token, address to, uint256 amount) external;

    function withdrawToSweepDestination(uint256 amount) external;

    function initialize(
        address initialOwner,
        uint256 _maximumOracleDelay,
        address _sweepDestination,
        uint256 _redemptionFee
    ) external;
}
