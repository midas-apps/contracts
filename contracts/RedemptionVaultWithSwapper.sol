// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import "./RedemptionVault.sol";
import "./interfaces/IRedemptionVault.sol";
import "./interfaces/IRedemptionVaultWithSwapper.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithSwapper
 * @notice Smart contract that handles mToken redemption.
 * In case of insufficient liquidity it uses a RV from a different
 * Midas product to fulfill instant redemption.
 * @dev mToken1 - is a main mToken of this vault
 * mToken2 - is a token of a second vault that is triggered when
 * current vault don`t have enough liquidity
 * @author RedDuck Software
 */
contract RedemptionVaultWithSwapper is
    IRedemptionVaultWithSwapper,
    RedemptionVault
{
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev added second gap here to match the storage layout
     * from the previous contracts inheritance tree
     */
    uint256[50] private ___gap;

    /**
     * @notice mToken1 redemption vault
     * @dev The naming was not altered to maintain
     * compatibility with the currently deployed contracts.
     */
    IRedemptionVault public mTbillRedemptionVault;

    /**
     * @notice liquidity provider to pull mToken1 from
     */
    address public liquidityProvider;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _mTokenInitParams init params for mToken1
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _redemptionInitParams init params for redemption vault state values
     * @param _mTbillRedemptionVault mToken2 redemptionVault address
     * @param _liquidityProvider liquidity provider for pull mToken2
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        RedemptionInitParams calldata _redemptionInitParams,
        address _mTbillRedemptionVault,
        address _liquidityProvider
    ) external initializer {
        __RedemptionVault_init(
            _commonVaultInitParams,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _redemptionInitParams
        );

        mTbillRedemptionVault = IRedemptionVault(_mTbillRedemptionVault);
        liquidityProvider = _liquidityProvider;
    }

    /**
     * @dev redeem mToken1 to tokenOut if daily limit and allowance not exceeded
     * If contract don't have enough tokenOut, mToken1 will swap to mToken2 and redeem on mToken2 vault
     * Burns mToken1 from the user, if swap need mToken1 just tranfers to contract.
     * Transfers fee in mToken1 to feeReceiver
     * Transfers tokenOut to user.
     * @param tokenOut token out address
     * @param amountMTokenIn amount of mToken1 to redeem
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     * @param recipient recipient address
     *
     * @return calcResult calculated redeem result
     */
    function _redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    )
        internal
        override
        returns (
            CalcAndValidateRedeemResult memory calcResult,
            bool spendLiquidity
        )
    {
        spendLiquidity = false;

        address user = msg.sender;

        (
            uint256 feeAmount,
            uint256 amountMTokenWithoutFee
        ) = _calcAndValidateRedeemForInstant(user, tokenOut, amountMTokenIn);

        calcResult.feeAmount = feeAmount;

        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        (
            uint256 amountTokenOut,
            uint256 mTokenRate,
            uint256 tokenOutRate
        ) = _convertMTokenToTokenOut(amountMTokenIn, 0, tokenOut, 0);

        calcResult.amountTokenOutWithoutFee = _truncate(
            (amountMTokenWithoutFee * mTokenRate) / tokenOutRate,
            tokenDecimals
        );

        if (feeAmount > 0)
            _tokenTransferFromUser(address(mToken), feeReceiver, feeAmount, 18);

        uint256 contractTokenOutBalance = _getBalanceOfThisBase18(
            tokenOut,
            tokenDecimals
        );

        _requireAndUpdateLimit(amountMTokenIn);
        _requireAndUpdateAllowance(tokenOut, amountTokenOut);

        if (contractTokenOutBalance >= calcResult.amountTokenOutWithoutFee) {
            mToken.burn(user, amountMTokenWithoutFee);
        } else {
            // saving stack size
            {
                address tokenOutCopy = tokenOut;
                uint256 minReceiveAmountCopy = minReceiveAmount;
                uint256 mTbillAmount = _swapMToken1ToMToken2(
                    amountMTokenWithoutFee
                );
                IRedemptionVault _mTokenRedemptionVault = mTbillRedemptionVault;

                require(
                    address(_mTokenRedemptionVault) != address(0),
                    "RVS: !mTokenRedemptionVault"
                );

                IERC20(_mTokenRedemptionVault.mToken()).safeIncreaseAllowance(
                    address(_mTokenRedemptionVault),
                    mTbillAmount
                );

                _mTokenRedemptionVault.redeemInstant(
                    tokenOutCopy,
                    mTbillAmount,
                    minReceiveAmountCopy
                );
            }

            uint256 contractTokenOutBalanceAfterRedeem = _getBalanceOfThisBase18(
                    tokenOut,
                    tokenDecimals
                );
            calcResult.amountTokenOutWithoutFee =
                contractTokenOutBalanceAfterRedeem -
                contractTokenOutBalance;
        }

        require(
            calcResult.amountTokenOutWithoutFee >= minReceiveAmount,
            "RVS: minReceiveAmount > actual"
        );

        _tokenTransferToUser(
            tokenOut,
            recipient,
            calcResult.amountTokenOutWithoutFee,
            tokenDecimals
        );
    }

    /**
     * @inheritdoc IRedemptionVaultWithSwapper
     */
    function setLiquidityProvider(address provider) external onlyVaultAdmin {
        liquidityProvider = provider;

        emit SetLiquidityProvider(msg.sender, provider);
    }

    /**
     * @inheritdoc IRedemptionVaultWithSwapper
     */
    function setSwapperVault(address newVault) external onlyVaultAdmin {
        mTbillRedemptionVault = IRedemptionVault(newVault);

        emit SetSwapperVault(msg.sender, newVault);
    }

    /**
     * @notice Transfers mToken1 to liquidity provider
     * Transfers mToken2 from liquidity provider to contract
     * Returns amount on mToken2 using exchange rates
     * @param mToken1Amount mToken1 token amount (decimals 18)
     */
    function _swapMToken1ToMToken2(uint256 mToken1Amount)
        internal
        returns (uint256 mTokenAmount)
    {
        address _liquidityProvider = liquidityProvider;

        require(_liquidityProvider != address(0), "RVS: !liquidityProvider");

        _tokenTransferFromUser(
            address(mToken),
            _liquidityProvider,
            mToken1Amount,
            18
        );

        uint256 mTbillRate = mTbillRedemptionVault
            .mTokenDataFeed()
            .getDataInBase18();
        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();
        mTokenAmount = Math.mulDiv(
            mToken1Amount,
            mTokenRate,
            mTbillRate,
            Math.Rounding.Up
        );

        _tokenTransferFromTo(
            address(mTbillRedemptionVault.mToken()),
            _liquidityProvider,
            address(this),
            mTokenAmount,
            18
        );
    }

    /**
     * @dev get balance of this contract in base18
     * @param token token address
     * @param decimals token decimals
     * @return balance in base18
     */
    function _getBalanceOfThisBase18(address token, uint256 decimals)
        private
        view
        returns (uint256)
    {
        return IERC20(token).balanceOf(address(this)).convertToBase18(decimals);
    }

    function _calcAndValidateRedeemForInstant(
        address user,
        address tokenOut,
        uint256 amountMTokenIn
    )
        internal
        view
        returns (uint256 feeAmount, uint256 amountMTokenWithoutFee)
    {
        _validateMTokenAmount(user, amountMTokenIn, false);

        feeAmount = _getFeeAmount(
            _getFee(user, tokenOut, true, 0),
            amountMTokenIn
        );

        _requireTokenExists(tokenOut);

        require(amountMTokenIn > feeAmount, "RVS: amountMTokenIn < fee");

        amountMTokenWithoutFee = amountMTokenIn - feeAmount;
    }
}
