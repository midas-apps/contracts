// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import "./interfaces/morpho/IERC4626Vault.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithMorpho
 * @notice Smart contract that handles redemptions using Morpho Vault withdrawals
 * @dev When the vault has insufficient payment token balance, it withdraws from
 * a Morpho Vault (ERC-4626) by burning its vault shares to obtain the underlying asset.
 * Works with both Morpho Vaults V1 (MetaMorpho) and V2.
 * @author RedDuck Software
 */
contract RedemptionVaultWithMorpho is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice Morpho Vault contract used for withdrawals
     */
    IERC4626Vault public morphoVault;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when the Morpho Vault address is updated
     * @param caller address of the caller
     * @param newVault new Morpho Vault address
     */
    event SetMorphoVault(address indexed caller, address indexed newVault);

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
     * @param _morphoVault Morpho Vault (ERC-4626) contract address
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
        address _morphoVault
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
        _validateAddress(_morphoVault, false);
        morphoVault = IERC4626Vault(_morphoVault);
    }

    /**
     * @notice Sets the Morpho Vault address
     * @param _morphoVault new Morpho Vault address
     */
    function setMorphoVault(address _morphoVault) external onlyVaultAdmin {
        _validateAddress(_morphoVault, false);
        morphoVault = IERC4626Vault(_morphoVault);
        emit SetMorphoVault(msg.sender, _morphoVault);
    }

    /**
     * @dev Redeem mToken to the selected payment token if daily limit and allowance are not exceeded.
     * If the contract doesn't have enough payment token, the Morpho Vault withdrawal flow will be
     * triggered to withdraw the missing amount from the Morpho Vault.
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
            "RVM: minReceiveAmount > actual"
        );

        _checkAndRedeemMorpho(tokenOutCopy, amountTokenOutWithoutFeeFrom18);

        _tokenTransferToUser(
            tokenOutCopy,
            recipient,
            amountTokenOutWithoutFee,
            tokenDecimals
        );
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, withdraw the missing amount from the Morpho Vault
     * @dev The Morpho Vault burns the vault's shares and transfers the underlying
     * asset directly to this contract. No approval is needed because the vault
     * burns shares from msg.sender (this contract) when msg.sender == owner.
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut needed
     */
    function _checkAndRedeemMorpho(address tokenOut, uint256 amountTokenOut)
        internal
    {
        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;

        require(morphoVault.asset() == tokenOut, "RVM: token not vault asset");

        uint256 sharesNeeded = morphoVault.previewWithdraw(missingAmount);
        require(
            morphoVault.balanceOf(address(this)) >= sharesNeeded,
            "RVM: insufficient shares"
        );

        morphoVault.withdraw(missingAmount, address(this), address(this));
    }
}
