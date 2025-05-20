// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.9;

interface IRedemption {
    /// @notice The ```SetMaximumOracleDelay``` event is emitted when the max oracle delay is set
    /// @param oldMaxOracleDelay The old max oracle delay
    /// @param newMaxOracleDelay The new max oracle delay
    event SetMaximumOracleDelay(
        uint256 oldMaxOracleDelay,
        uint256 newMaxOracleDelay
    );

    /// @notice The ```SetSweepDestination``` event is emitted when the sweep destination is set
    /// @param oldSweepDestination The old sweep destination
    /// @param newSweepDestination The new sweep destination
    event SetSweepDestination(
        address oldSweepDestination,
        address newSweepDestination
    );

    /// @notice The ```SetRedemptionFee``` event is emitted when the redemption fee is set
    /// @param oldFee The old fee
    /// @param newFee The new fee
    event SetRedemptionFee(uint256 oldFee, uint256 newFee);

    /// @dev Event emitted when SUPERSTATE_TOKEN is redeemed for USDC
    /// @param redeemer The address of the entity redeeming
    /// @param to The receiver address for the redeemed USDC
    /// @param superstateTokenInAmount The amount of SUPERSTATE_TOKEN to redeem
    /// @param usdcOutAmountAfterFee The amount of USDC the redeemer gets back, after the fee is deducted
    /// @param usdcOutAmountBeforeFee The amount of USDC the redeemer gets back, before the fee is deducted
    event RedeemV2(
        address indexed redeemer,
        address indexed to,
        uint256 superstateTokenInAmount,
        uint256 usdcOutAmountAfterFee,
        uint256 usdcOutAmountBeforeFee
    );

    /// @dev Event emitted when tokens are withdrawn
    /// @param token The address of the token being withdrawn
    /// @param withdrawer The address of the caller
    /// @param to The address receiving the tokens
    /// @param amount The amount of token the redeemer gets back
    event Withdraw(
        address indexed token,
        address indexed withdrawer,
        address indexed to,
        uint256 amount
    );

    /// @dev Thrown when an argument is invalid
    error BadArgs();

    /// @dev Thrown when Chainlink Oracle data is bad
    error BadChainlinkData();

    /// @dev Thrown when owner tries to set the fee for a stablecoin too high
    error FeeTooHigh();

    /// @dev Thrown when there isn't enough token balance in the contract
    error InsufficientBalance();

    /// @dev Thrown if an attempt to call `renounceOwnership` is made
    error RenounceOwnershipDisabled();

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
