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
     * @notice Convert an amount of one token to another through their USD rates
     * @dev using ceiling division on both steps
     * @param _amount The amount of the source token to convert
     * @param _fromRate The USD rate of the source token
     * @param _toRate The USD rate of the target token
     * @return The amount of the target token
     */
    function convertTokenAmountRoundingUp(
        uint256 _amount,
        uint256 _fromRate,
        uint256 _toRate
    ) internal pure returns (uint256) {
        uint256 amountUsd = Math.mulDiv(
            _amount,
            _fromRate,
            1e18,
            Math.Rounding.Up
        );
        return Math.mulDiv(amountUsd, 1e18, _toRate, Math.Rounding.Up);
    }

    /**
     * @notice Convert an amount of one token to another through their USD rates
     * @dev using floor division on both steps
     * @param _amount The amount of the source token to convert
     * @param _fromRate The USD rate of the source token
     * @param _toRate The USD rate of the target token
     * @return The amount of the target token
     */
    function convertTokenAmountRoundingDown(
        uint256 _amount,
        uint256 _fromRate,
        uint256 _toRate
    ) internal pure returns (uint256) {
        uint256 amountUsd = Math.mulDiv(
            _amount,
            _fromRate,
            1e18,
            Math.Rounding.Down
        );
        return Math.mulDiv(amountUsd, 1e18, _toRate, Math.Rounding.Down);
    }
}
