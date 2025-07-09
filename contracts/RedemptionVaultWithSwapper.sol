// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

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

    address public liquidityProvider;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken1
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     * @param _fiatRedemptionInitParams params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount
     * @param _requestRedeemer address is designated for standard redemptions, allowing tokens to be pulled from this address
     * @param _mTbillRedemptionVault mToken2 redemptionVault address
     * @param _liquidityProvider liquidity provider for pull mToken2
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        FiatRedeptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer,
        address _mTbillRedemptionVault,
        address _liquidityProvider
    ) external initializer {
        __RedemptionVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _fiatRedemptionInitParams,
            _requestRedeemer
        );
        _validateAddress(_mTbillRedemptionVault, true);
        _validateAddress(_liquidityProvider, false);

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
            uint256 amountTokenOutWithoutFee
        )
    {
        address user = msg.sender;

        calcResult = _calcAndValidateRedeem(
            user,
            tokenOut,
            amountMTokenIn,
            true,
            false
        );

        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        uint256 amountMTokenInCopy = amountMTokenIn;
        address tokenOutCopy = tokenOut;
        uint256 minReceiveAmountCopy = minReceiveAmount;

        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(
            amountMTokenInCopy
        );
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(
            amountMTokenInUsd,
            tokenOutCopy
        );

        amountTokenOutWithoutFee = _truncate(
            (calcResult.amountMTokenWithoutFee * mTokenRate) / tokenOutRate,
            tokenDecimals
        );

        require(
            amountTokenOutWithoutFee >= minReceiveAmountCopy,
            "RVS: minReceiveAmount > actual"
        );

        if (calcResult.feeAmount > 0)
            _tokenTransferFromUser(
                address(mToken),
                feeReceiver,
                calcResult.feeAmount,
                18
            );

        uint256 contractTokenOutBalance = IERC20(tokenOutCopy).balanceOf(
            address(this)
        );

        _requireAndUpdateLimit(amountMTokenInCopy);
        _requireAndUpdateAllowance(tokenOutCopy, amountTokenOut);

        if (
            contractTokenOutBalance >=
            amountTokenOutWithoutFee.convertFromBase18(tokenDecimals)
        ) {
            mToken.burn(user, calcResult.amountMTokenWithoutFee);
        } else {
            uint256 mTbillAmount = _swapMToken1ToMToken2(
                calcResult.amountMTokenWithoutFee
            );

            IERC20(mTbillRedemptionVault.mToken()).safeIncreaseAllowance(
                address(mTbillRedemptionVault),
                mTbillAmount
            );

            mTbillRedemptionVault.redeemInstant(
                tokenOutCopy,
                mTbillAmount,
                minReceiveAmountCopy
            );

            uint256 contractTokenOutBalanceAfterRedeem = IERC20(tokenOutCopy)
                .balanceOf(address(this));
            amountTokenOutWithoutFee = (contractTokenOutBalanceAfterRedeem -
                contractTokenOutBalance).convertToBase18(tokenDecimals);
        }

        _tokenTransferToUser(
            tokenOutCopy,
            recipient,
            amountTokenOutWithoutFee,
            tokenDecimals
        );
    }

    /**
     * @inheritdoc IRedemptionVaultWithSwapper
     */
    function setLiquidityProvider(address provider) external onlyVaultAdmin {
        require(liquidityProvider != provider, "MRVS: already provider");
        _validateAddress(provider, false);

        liquidityProvider = provider;

        emit SetLiquidityProvider(msg.sender, provider);
    }

    /**
     * @inheritdoc IRedemptionVaultWithSwapper
     */
    function setSwapperVault(address newVault) external onlyVaultAdmin {
        require(
            newVault != address(mTbillRedemptionVault),
            "MRVS: already provider"
        );
        _validateAddress(newVault, true);

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
        _tokenTransferFromUser(
            address(mToken),
            liquidityProvider,
            mToken1Amount,
            18
        );

        uint256 mTbillRate = mTbillRedemptionVault
            .mTokenDataFeed()
            .getDataInBase18();
        uint256 mTokenRate = mTokenDataFeed.getDataInBase18();
        mTokenAmount = (mToken1Amount * mTokenRate) / mTbillRate;

        _tokenTransferFromTo(
            address(mTbillRedemptionVault.mToken()),
            liquidityProvider,
            address(this),
            mTokenAmount,
            18
        );
    }
}
