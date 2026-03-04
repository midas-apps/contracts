// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./RedemptionVault.sol";
import "./interfaces/IRedemptionVault.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithMToken
 * @notice Smart contract that handles redemptions using mToken RedemptionVault withdrawals
 * @dev Storage layout is preserved for safe upgrades from RedemptionVaultWithSwapper
 * @author RedDuck Software
 */
contract RedemptionVaultWithMToken is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @dev Storage gap preserved from RedemptionVaultWithSwapper layout
     */
    uint256[50] private ___gap;

    /**
     * @notice mToken RedemptionVault used for fallback redemptions
     */
    /// @custom:oz-renamed-from mTbillRedemptionVault
    IRedemptionVault public redemptionVault;

    /**
     * @dev DEPRECATED storage slot kept for layout compatibility
     */
    /// @custom:oz-renamed-from liquidityProvider
    // solhint-disable-next-line var-name-mixedcase
    address public liquidityProvider_deprecated;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when the redemption vault address is updated
     * @param caller address of the caller
     * @param newVault new redemption vault address
     */
    event SetRedemptionVault(address indexed caller, address indexed newVault);

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     * @param _fiatRedemptionInitParams params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount
     * @param _requestRedeemer address is designated for standard redemptions, allowing tokens to be pulled from this address
     * @param _redemptionVault address of the mTokenA RedemptionVault
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
        address _redemptionVault
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
        _validateAddress(_redemptionVault, true);
        redemptionVault = IRedemptionVault(_redemptionVault);
    }

    /**
     * @notice Sets the mTokenA RedemptionVault address
     * @param _redemptionVault new RedemptionVault address
     */
    function setRedemptionVault(address _redemptionVault)
        external
        onlyVaultAdmin
    {
        require(
            _redemptionVault != address(redemptionVault),
            "RVMT: already set"
        );
        _validateAddress(_redemptionVault, true);

        redemptionVault = IRedemptionVault(_redemptionVault);

        emit SetRedemptionVault(msg.sender, _redemptionVault);
    }

    /**
     * @dev Redeem mToken to the selected payment token if daily limit and allowance are not exceeded.
     * If the contract doesn't have enough payment token, the mToken RedemptionVault flow
     * will be triggered to redeem the missing amount.
     * Burns mToken from the user.
     * Transfers fee in mToken to feeReceiver.
     * Transfers tokenOut to user.
     * @param tokenOut token out address
     * @param amountMTokenIn amount of mToken to redeem
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     * @param recipient address that will receive the tokenOut
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

        _requireAndUpdateLimit(amountMTokenIn);

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

        _requireAndUpdateAllowance(tokenOutCopy, amountTokenOut);

        mToken.burn(user, calcResult.amountMTokenWithoutFee);
        if (calcResult.feeAmount > 0)
            _tokenTransferFromUser(
                address(mToken),
                feeReceiver,
                calcResult.feeAmount,
                18
            );

        uint256 amountTokenOutWithoutFeeFrom18 = ((calcResult
            .amountMTokenWithoutFee * mTokenRate) / tokenOutRate)
            .convertFromBase18(tokenDecimals);

        amountTokenOutWithoutFee = amountTokenOutWithoutFeeFrom18
            .convertToBase18(tokenDecimals);

        require(
            amountTokenOutWithoutFee >= minReceiveAmountCopy,
            "RVMT: minReceiveAmount > actual"
        );

        _checkAndRedeemMToken(
            tokenOutCopy,
            amountTokenOutWithoutFeeFrom18,
            tokenOutRate
        );

        _tokenTransferToUser(
            tokenOutCopy,
            recipient,
            amountTokenOutWithoutFee,
            tokenDecimals
        );
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, redeem the missing amount via mToken RedemptionVault
     * @dev The other vault burns this contract's mToken and transfers the
     * underlying asset to this contract
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut needed (native decimals)
     * @param tokenOutRate tokenOut price rate (decimals 18)
     */
    function _checkAndRedeemMToken(
        address tokenOut,
        uint256 amountTokenOut,
        uint256 tokenOutRate
    ) internal {
        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;
        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        uint256 missingAmountBase18 = missingAmount.convertToBase18(
            tokenDecimals
        );
        uint256 mTokenARate = redemptionVault
            .mTokenDataFeed()
            .getDataInBase18();

        uint256 mTokenAAmount = (missingAmountBase18 * tokenOutRate) /
            mTokenARate +
            1;

        address mTokenA = address(redemptionVault.mToken());

        require(
            IERC20(mTokenA).balanceOf(address(this)) >= mTokenAAmount,
            "RVMT: insufficient mToken balance"
        );

        IERC20(mTokenA).safeIncreaseAllowance(
            address(redemptionVault),
            mTokenAAmount
        );

        redemptionVault.redeemInstant(
            tokenOut,
            mTokenAAmount,
            missingAmountBase18
        );
    }
}
