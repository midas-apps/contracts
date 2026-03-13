// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import "./interfaces/ustb/IUSTBRedemption.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithUSTB
 * @notice Smart contract that handles redemptions using USTB
 * @author RedDuck Software
 */
contract RedemptionVaultWithUSTB is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice USTB redemption contract address
     * @dev Used to handle USTB redemptions when vault has insufficient USDC
     */
    IUSTBRedemption public ustbRedemption;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _fiatRedemptionInitParams params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount
     * @param _requestRedeemer address is designated for standard redemptions, allowing tokens to be pulled from this address
     * @param _ustbRedemption USTB redemption contract address
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        FiatRedemptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer,
        address _loanLp,
        address _loanLpFeeReceiver,
        address _ustbRedemption
    ) external initializer {
        __RedemptionVault_init(
            _commonVaultInitParams,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _fiatRedemptionInitParams,
            _requestRedeemer,
            _loanLp,
            _loanLpFeeReceiver
        );
        _validateAddress(_ustbRedemption, false);
        ustbRedemption = IUSTBRedemption(_ustbRedemption);
    }

    /**
     * @dev Redeem mToken to the selected payment token if daily limit and allowance are not exceeded.
     * If USDC is the payment token and the contract doesn't have enough USDC, the USTB redemption flow will be triggered for the missing amount.
     * Burns mToken from the user.
     * Transfers fee in mToken to feeReceiver.
     * Transfers tokenOut to user.
     * @param tokenOut token out address
     * @param amountMTokenIn amount of mToken to redeem
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     *
     * @return calcResult calculated redeem result
     */
    function _redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount
    )
        internal
        override
        returns (
            CalcAndValidateRedeemResult memory calcResult,
            bool spendLiquidity
        )
    {
        (calcResult, spendLiquidity) = super._redeemInstant(
            tokenOut,
            amountMTokenIn,
            minReceiveAmount
        );

        _checkAndRedeemUSTB(tokenOut, calcResult.amountTokenOutWithoutFee);
    }

    /**
     * @notice Check if contract has enough USDC balance for redeem
     * if not, trigger USTB redemption flow to redeem exactly the missing amount
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut needed
     */
    function _checkAndRedeemUSTB(address tokenOut, uint256 amountTokenOut)
        internal
    {
        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        require(tokenOut == ustbRedemption.USDC(), "RVU: invalid token");

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;

        uint256 fee = ustbRedemption.calculateFee(missingAmount);
        require(fee == 0, "RVU: ustb fee not zero");

        (uint256 ustbToRedeem, ) = ustbRedemption.calculateUstbIn(
            missingAmount
        );

        IERC20 ustb = IERC20(ustbRedemption.SUPERSTATE_TOKEN());
        uint256 ustbBalance = ustb.balanceOf(address(this));

        require(ustbBalance >= ustbToRedeem, "RVU: insufficient USTB balance");

        ustb.safeIncreaseAllowance(address(ustbRedemption), ustbToRedeem);
        ustbRedemption.redeem(ustbToRedeem);
    }
}
