// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {MathUpgradeable as Math} from "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IDepositVault} from "../interfaces/IDepositVault.sol";
import {IUSYCTeller} from "../interfaces/usyc/IUSYCTeller.sol";
import {ManageableVault} from "../abstract/ManageableVault.sol";
import {IDataFeed} from "../interfaces/IDataFeed.sol";

import {DecimalsCorrectionLibrary} from "./DecimalsCorrectionLibrary.sol";
import {RedemptionSwapperHelpersLibrary} from "./RedemptionSwapperHelpersLibrary.sol";

/**
 * @title VaultsWithUSYCLibrary
 * @notice USYC liquidity strategy of RedemptionVaultWithUSYC, deployed
 * as a linked library to reduce the vault bytecode size, and the Teller
 * fee math shared with DepositVaultWithUSYC
 * @author RedDuck Software
 */
library VaultsWithUSYCLibrary {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice 100% in Teller fee rate units: rates have 18 decimals
     * of a percent, 1e18 = 1%
     */
    uint256 private constant _HUNDRED_PCT = 100e18;

    /**
     * @notice when the Teller returns less than it previewed
     * @param received amount received from the Teller
     * @param expected amount previewed by the Teller
     */
    error InsufficientAmountReceived(uint256 received, uint256 expected);

    /**
     * @notice Redeems USYC held by the calling vault through the Teller
     * to cover `missingAmountBase18` of `tokenOut`
     * @dev Executed in the context of the calling vault (delegatecall).
     * If `tokenOut` is the Teller asset (USDC), USYC is redeemed to it directly.
     * If `tokenOut` is the mToken of `dv`, USYC is redeemed to USDC and
     * the USDC is deposited into `dv`, every conversion rounding up so that
     * the obtained amount covers `missingAmountBase18`.
     * Returns 0 without redeeming when `tokenOut` is neither, the Teller
     * redemption fee rate differs from `anticipatedFeeRate`, the fee previewed
     * by the Teller exceeds {maxFee}, the vault is not fee waived on `dv` or
     * `dv` does not accept USDC.
     * Reverts when the Teller pays out less USDC than previewed.
     *
     * NOTE: redeemed shares are capped by `teller.maxRedeem`, which the
     * Teller derives from `totalAssets()` (the USDC its treasury can pay out
     * right now) and the vault USYC balance, so only immediately redeemable
     * liquidity is used. If it is lower than needed, a partial amount is
     * obtained and the vault falls back to its other liquidity sources
     * @param teller USYC Teller
     * @param dv mToken DepositVault, can be zero
     * @param anticipatedFeeRate anticipated Teller redemption fee rate
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutDecimals decimals of tokenOut
     * @return obtained amount of tokenOut in base 18
     */
    function obtainRedemptionLiquidity(
        IUSYCTeller teller,
        IDepositVault dv,
        uint256 anticipatedFeeRate,
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 tokenOutDecimals
    )
        public
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        address usdc = teller.asset();
        bool isMToken = address(dv) != address(0)
            ? address(dv.mToken()) == tokenOut
            : false;

        // if tokenOut is neither USDC nor the DV mToken, do nothing
        if (tokenOut != usdc && !isMToken) {
            return 0;
        }

        if (teller.redemptionFeeRate(address(this)) != anticipatedFeeRate) {
            return 0;
        }

        uint256 assetAmount = missingAmountBase18;

        if (isMToken) {
            if (
                !ManageableVault(address(dv)).waivedFeeRestriction(
                    address(this)
                )
            ) {
                return 0;
            }

            (address feed, , , bool isStable) = ManageableVault(address(dv))
                .tokensConfig(usdc);

            if (feed == address(0)) {
                return 0;
            }

            uint256 usdcRate = isStable
                ? 1e18
                : IDataFeed(feed).getDataInBase18();

            // DV mints floor(floor(usdc * usdcRate / 1e18) * 1e18 / mTokenRate),
            // so both steps are inverted with rounding up to guarantee
            // that the minted mToken amount covers `missingAmountBase18`
            assetAmount = RedemptionSwapperHelpersLibrary
                .convertTokenAmountRoundingUp(
                    missingAmountBase18,
                    dv.mTokenDataFeed().getDataInBase18(),
                    usdcRate
                );
        }

        uint8 usdcDecimals = IERC20Metadata(usdc).decimals();
        assetAmount = _convertFromBase18Covering(assetAmount, usdcDecimals);

        (uint256 usycToRedeem, , ) = teller.previewWithdrawData(
            address(this),
            assetAmount
        );

        usycToRedeem = Math.min(teller.maxRedeem(address(this)), usycToRedeem);

        // if nothing to redeem, do nothing
        if (usycToRedeem == 0) {
            return 0;
        }

        uint256 receivedUsdc = _redeemUsyc(
            teller,
            usycToRedeem,
            anticipatedFeeRate
        );

        // the Teller fee exceeds the maximum, nothing is redeemed
        if (receivedUsdc == 0) {
            return 0;
        }

        uint256 receivedTokenOut;
        if (isMToken) {
            IERC20(usdc).safeIncreaseAllowance(address(dv), receivedUsdc);
            receivedTokenOut = dv.depositInstant(
                usdc,
                receivedUsdc.convertToBase18(usdcDecimals),
                0,
                bytes32(0)
            );
        } else {
            receivedTokenOut = receivedUsdc.convertToBase18(tokenOutDecimals);
        }

        return receivedTokenOut;
    }

    /**
     * @notice Maximum fee the Teller can take from `grossAmount` at `feeRate`
     * @dev Same formula as the TellerFeeManager, where the rate applies to
     * the net amount: `gross - floor(gross * 100% / (100% + rate))`.
     * The Teller does not charge fees under its daily free tier, so the
     * fee it actually takes can be lower
     * @param grossAmount amount the fee is taken from
     * @param feeRate Teller fee rate, 1e18 = 1%
     * @return maximum fee
     */
    function maxFee(uint256 grossAmount, uint256 feeRate)
        internal
        pure
        returns (uint256)
    {
        return
            Math.mulDiv(
                grossAmount,
                feeRate,
                _HUNDRED_PCT + feeRate,
                Math.Rounding.Up
            );
    }

    /**
     * @dev Redeems `usycAmount` USYC through the Teller to this contract.
     * Returns 0 without redeeming when the fee previewed by the Teller
     * exceeds {maxFee}. Reverts when the Teller pays out less USDC
     * than previewed
     * @param teller USYC Teller
     * @param usycAmount amount of USYC to redeem
     * @param feeRate Teller redemption fee rate
     * @return receivedUsdc amount of USDC received
     */
    function _redeemUsyc(
        IUSYCTeller teller,
        uint256 usycAmount,
        uint256 feeRate
    ) private returns (uint256 receivedUsdc) {
        (uint256 expectedUsdc, uint256 fee, ) = teller.previewRedeemData(
            address(this),
            usycAmount
        );

        if (fee > maxFee(expectedUsdc + fee, feeRate)) {
            return 0;
        }

        receivedUsdc = teller.redeem(usycAmount, address(this), address(this));
        require(
            receivedUsdc >= expectedUsdc,
            InsufficientAmountReceived(receivedUsdc, expectedUsdc)
        );
    }

    /**
     * @dev converts `amountBase18` to `decimals` so that the converted
     * amount always covers `amountBase18`, i.e. precision lost on
     * truncation is compensated by one unit of the smallest denomination
     * @param amountBase18 amount in base18
     * @param decimals target decimals
     * @return amount converted amount that covers `amountBase18`
     */
    function _convertFromBase18Covering(uint256 amountBase18, uint256 decimals)
        private
        pure
        returns (uint256 amount)
    {
        amount = amountBase18.convertFromBase18(decimals);
        if (amount.convertToBase18(decimals) < amountBase18) ++amount;
    }
}
