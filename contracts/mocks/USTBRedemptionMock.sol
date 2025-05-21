// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ustb/IRedemption.sol";

contract USTBRedemptionMock {
    using SafeERC20 for IERC20;

    event RedeemV2(
        address indexed redeemer,
        address indexed to,
        uint256 superstateTokenInAmount,
        uint256 usdcOutAmountAfterFee,
        uint256 usdcOutAmountBeforeFee
    );

    uint256 public constant USDC_DECIMALS = 8; // Mock to match our tests
    uint256 public constant USDC_PRECISION = 10 ** USDC_DECIMALS;
    uint256 public constant SUPERSTATE_TOKEN_DECIMALS = 6;
    uint256 public constant SUPERSTATE_TOKEN_PRECISION =
        10 ** SUPERSTATE_TOKEN_DECIMALS;
    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public constant CHAINLINK_FEED_PRECISION = 10 ** 8;

    IERC20 public immutable SUPERSTATE_TOKEN;
    IERC20 public immutable USDC;

    uint256 public redemptionFee;
    bool private _isPaused;
    bool private _chainlinkIsBadData;
    uint256 private _chainlinkPrice;

    uint256 public _maxUstbRedemptionAmount;

    constructor(address ustbToken, address usdcToken) {
        SUPERSTATE_TOKEN = IERC20(ustbToken);
        USDC = IERC20(usdcToken);

        redemptionFee = 0;
        _isPaused = false;
        _chainlinkIsBadData = false;
        _chainlinkPrice = 1 * CHAINLINK_FEED_PRECISION; // $1 per USTB with 8 decimals
    }

    function calculateFee(uint256 amount) public view returns (uint256) {
        return (amount * redemptionFee) / FEE_DENOMINATOR;
    }

    function calculateUstbIn(
        uint256 usdcOutAmount
    )
        public
        view
        returns (uint256 ustbInAmount, uint256 usdPerUstbChainlinkRaw)
    {
        if (usdcOutAmount == 0) revert("USTBRedemptionMock: BadArgs");

        uint256 usdcOutAmountBeforeFee = (usdcOutAmount * FEE_DENOMINATOR) /
            (FEE_DENOMINATOR - redemptionFee);

        (
            bool isBadData,
            ,
            uint256 usdPerUstbChainlinkRaw_
        ) = _getChainlinkPrice();
        if (isBadData) revert("USTBRedemptionMock: BadChainlinkData");

        usdPerUstbChainlinkRaw = usdPerUstbChainlinkRaw_;

        // Round up by adding the denominator - 1 before division
        uint256 numerator = usdcOutAmountBeforeFee *
            CHAINLINK_FEED_PRECISION *
            SUPERSTATE_TOKEN_PRECISION;
        uint256 denominator = usdPerUstbChainlinkRaw * USDC_PRECISION;
        ustbInAmount = (numerator + denominator - 1) / denominator;
    }

    function calculateUsdcOut(
        uint256 superstateTokenInAmount
    )
        external
        view
        returns (uint256 usdcOutAmountAfterFee, uint256 usdPerUstbChainlinkRaw)
    {
        (usdcOutAmountAfterFee, , usdPerUstbChainlinkRaw) = _calculateUsdcOut(
            superstateTokenInAmount
        );
    }

    function _calculateUsdcOut(
        uint256 superstateTokenInAmount
    )
        internal
        view
        returns (
            uint256 usdcOutAmountAfterFee,
            uint256 usdcOutAmountBeforeFee,
            uint256 usdPerUstbChainlinkRaw
        )
    {
        if (superstateTokenInAmount == 0) revert("USTBRedemptionMock: BadArgs");

        (
            bool isBadData,
            ,
            uint256 usdPerUstbChainlinkRaw_
        ) = _getChainlinkPrice();
        if (isBadData) revert("USTBRedemptionMock: BadChainlinkData");

        usdPerUstbChainlinkRaw = usdPerUstbChainlinkRaw_;

        usdcOutAmountBeforeFee =
            (superstateTokenInAmount *
                usdPerUstbChainlinkRaw *
                USDC_PRECISION) /
            (CHAINLINK_FEED_PRECISION * SUPERSTATE_TOKEN_PRECISION);

        usdcOutAmountAfterFee =
            usdcOutAmountBeforeFee -
            calculateFee(usdcOutAmountBeforeFee);
    }

    function maxUstbRedemptionAmount()
        external
        view
        returns (uint256 superstateTokenAmount, uint256 usdPerUstbChainlinkRaw)
    {
        return (_maxUstbRedemptionAmount, _chainlinkPrice);
    }

    function redeem(uint256 superstateTokenInAmount) external {
        _redeem(msg.sender, superstateTokenInAmount);
    }

    function redeem(address to, uint256 superstateTokenInAmount) external {
        _redeem(to, superstateTokenInAmount);
    }

    function _redeem(address to, uint256 superstateTokenInAmount) internal {
        _requireNotPaused();

        (
            uint256 usdcOutAmountAfterFee,
            uint256 usdcOutAmountBeforeFee,

        ) = _calculateUsdcOut(superstateTokenInAmount);

        if (USDC.balanceOf(address(this)) < usdcOutAmountAfterFee)
            revert("USTBRedemptionMock: InsufficientBalance");

        SUPERSTATE_TOKEN.safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: superstateTokenInAmount
        });
        USDC.safeTransfer({to: to, value: usdcOutAmountAfterFee});

        emit RedeemV2({
            redeemer: msg.sender,
            to: to,
            superstateTokenInAmount: superstateTokenInAmount,
            usdcOutAmountAfterFee: usdcOutAmountAfterFee,
            usdcOutAmountBeforeFee: usdcOutAmountBeforeFee
        });
    }

    function withdraw(address _token, address to, uint256 amount) external {
        if (amount == 0) revert("USTBRedemptionMock: BadArgs");

        IERC20 token = IERC20(_token);
        uint256 balance = token.balanceOf(address(this));

        if (balance < amount) revert("USTBRedemptionMock: InsufficientBalance");

        token.safeTransfer({to: to, value: amount});
    }

    function _getChainlinkPrice()
        internal
        view
        returns (bool _isBadData, uint256 _updatedAt, uint256 _price)
    {
        return (_chainlinkIsBadData, block.timestamp, _chainlinkPrice);
    }

    function _requireNotPaused() internal view {
        require(!_isPaused, "USTBRedemptionMock: Paused");
    }

    function setRedemptionFee(uint256 fee) external {
        redemptionFee = fee;
    }

    function setChainlinkData(uint256 price, bool isBadData) external {
        _chainlinkPrice = price;
        _chainlinkIsBadData = isBadData;
    }

    function setPaused(bool paused) external {
        _isPaused = paused;
    }

    function setMaxUstbRedemptionAmount(
        uint256 maxUstbRedemptionAmount_
    ) external {
        _maxUstbRedemptionAmount = maxUstbRedemptionAmount_;
    }
}
