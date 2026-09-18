// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IRedemptionVault} from "../interfaces/IRedemptionVault.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {DecimalsCorrectionLibrary} from "./DecimalsCorrectionLibrary.sol";

library RedemptionSwapperHelpersLibrary {
    using SafeERC20 for IERC20;
    using DecimalsCorrectionLibrary for uint256;

    function getSwapperDetails(
        IRedemptionVault _redemptionVault,
        address _getBalanceOf
    )
        internal
        view
        returns (
            uint256 mTokenARate,
            IERC20 mTokenA,
            uint256 mTokenABalance
        )
    {
        mTokenARate = _redemptionVault.mTokenDataFeed().getDataInBase18();
        mTokenA = IERC20(address(_redemptionVault.mToken()));
        mTokenABalance = mTokenA.balanceOf(_getBalanceOf);
    }

    function redeemInstantSwapper(
        IRedemptionVault _swapperVault,
        IERC20 _mTokenA,
        address _liquiditySource,
        address _tokenOut,
        uint256 _mTokenAAmount,
        uint256 _tokenOutDecimals
    ) internal returns (uint256) {
        if (_liquiditySource != address(this)) {
            _mTokenA.safeTransferFrom(
                _liquiditySource,
                address(this),
                _mTokenAAmount
            );
        }

        _mTokenA.safeIncreaseAllowance(address(_swapperVault), _mTokenAAmount);

        return
            _swapperVault
                .redeemInstant(_tokenOut, _mTokenAAmount, 0)
                .convertToBase18(_tokenOutDecimals);
    }

    /**
     * @notice Convert a token out amount to an mToken amount
     * @dev using ceiling division to avoid rounding errors
     * @param _tokenOutAmount The amount of token out to convert
     * @param _tokenOutRate The rate of the token out
     * @param _mTokenRate The rate of the mToken
     * @return The amount of mToken
     */
    function tokenOutAmountToMTokenAmount(
        uint256 _tokenOutAmount,
        uint256 _tokenOutRate,
        uint256 _mTokenRate
    ) internal pure returns (uint256) {
        uint256 amountUsd = Math.mulDiv(
            _tokenOutAmount,
            _tokenOutRate,
            1e18,
            Math.Rounding.Up
        );
        return Math.mulDiv(amountUsd, 1e18, _mTokenRate, Math.Rounding.Up);
    }

    /**
     * @notice Convert an mToken amount to a token out amount
     * @dev using floor division to avoid rounding errors
     * @param _mTokenAmount The amount of mToken to convert
     * @param _mTokenRate The rate of the mToken
     * @param _tokenOutRate The rate of the token out
     * @return The amount of token out
     */
    function mTokenAmountToTokenOutAmount(
        uint256 _mTokenAmount,
        uint256 _mTokenRate,
        uint256 _tokenOutRate
    ) internal pure returns (uint256) {
        uint256 amountUsd = Math.mulDiv(
            _mTokenAmount,
            _mTokenRate,
            1e18,
            Math.Rounding.Down
        );
        return Math.mulDiv(amountUsd, 1e18, _tokenOutRate, Math.Rounding.Down);
    }
}
