// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IDepositVault} from "../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../interfaces/IRedemptionVault.sol";
import {IUSYCTeller} from "../interfaces/usyc/IUSYCTeller.sol";
import {CommonVaultInitParams} from "../interfaces/IManageableVault.sol";
import {ManageableVault, TokenConfig} from "../abstract/ManageableVault.sol";
import {IDataFeed} from "../interfaces/IDataFeed.sol";

import {DecimalsCorrectionLibrary} from "./DecimalsCorrectionLibrary.sol";
import {RedemptionSwapperHelpersLibrary} from "./RedemptionSwapperHelpersLibrary.sol";

library RedemptionVaultWithUSYCLibrary {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    function obtainRedemptionLiquidity(
        IUSYCTeller teller,
        IDepositVault dv,
        uint256 anticipatedFee,
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

        // If tokenOut is not the usdc or mToken, do nothing
        if (tokenOut != usdc && !isMToken) {
            return 0;
        }

        uint256 assetAmount = missingAmountBase18;

        if (isMToken) {
            (address feed, , , bool isStable) = ManageableVault(address(dv))
                .tokensConfig(usdc);

            if (feed == address(0)) {
                return 0;
            }

            uint256 usdcRate = isStable
                ? 1e18
                : IDataFeed(feed).getDataInBase18();

            assetAmount = RedemptionSwapperHelpersLibrary
                .mTokenAmountToTokenOutAmount(
                    missingAmountBase18,
                    dv.mTokenDataFeed().getDataInBase18(),
                    usdcRate
                );
        }

        uint8 usdcDecimals = IERC20Metadata(usdc).decimals();

        {
            uint256 totalAssets = teller.totalAssets();
            assetAmount = assetAmount.convertFromBase18(usdcDecimals);
            assetAmount = assetAmount > totalAssets ? totalAssets : assetAmount;
        }

        (uint256 usycToRedeem, uint256 fee, ) = teller.previewWithdrawData(
            address(this),
            assetAmount
        );

        if (fee != anticipatedFee) {
            return 0;
        }

        uint256 usycBalance = IERC20(teller.share()).balanceOf(address(this));

        usycToRedeem = usycBalance >= usycToRedeem ? usycToRedeem : usycBalance;

        // if nothing to redeem, do nothing
        if (usycToRedeem == 0) {
            return 0;
        }

        uint256 receivedUsdc = teller.redeem(
            usycToRedeem,
            address(this),
            address(this)
        );

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
}
