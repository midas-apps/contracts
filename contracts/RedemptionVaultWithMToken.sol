// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

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
     * @custom:oz-renamed-from mTbillRedemptionVault
     */
    IRedemptionVault public redemptionVault;

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
     * @param _commonVaultInitParams init params for common vault
     * @param _redemptionInitParams init params for redemption vault state values
     * @param _redemptionVault address of the mTokenA RedemptionVault
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        RedemptionVaultInitParams calldata _redemptionInitParams,
        address _redemptionVault
    ) external {
        initialize(_commonVaultInitParams, _redemptionInitParams);
        _validateAddress(_redemptionVault, true);
        redemptionVault = IRedemptionVault(_redemptionVault);
    }

    /**
     * @notice Sets the mTokenA RedemptionVault address
     * @param _redemptionVault new RedemptionVault address
     */
    function setRedemptionVault(address _redemptionVault)
        external
        validateVaultAdminAccess
    {
        require(
            _redemptionVault != address(redemptionVault),
            SameAddressValue(_redemptionVault)
        );
        _validateAddress(_redemptionVault, true);

        redemptionVault = IRedemptionVault(_redemptionVault);

        emit SetRedemptionVault(msg.sender, _redemptionVault);
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, redeem the missing amount via mToken RedemptionVault
     * @dev The other vault burns this contract's mToken and transfers the
     * underlying asset to this contract
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     */
    function _useVaultLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 tokenOutRate,
        uint256, /* currentTokenOutBalanceBase18 */
        uint256 /* tokenOutDecimals */
    )
        internal
        virtual
        override
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        uint256 mTokenARate = redemptionVault
            .mTokenDataFeed()
            .getDataInBase18();

        // Ceil so the inner vault's floored output is still >= missingAmountBase18.
        uint256 mTokenAAmount = Math.mulDiv(
            missingAmountBase18,
            tokenOutRate,
            mTokenARate,
            Math.Rounding.Up
        );

        address mTokenA = address(redemptionVault.mToken());
        uint256 mTokenABalance = IERC20(mTokenA).balanceOf(address(this));

        mTokenAAmount = mTokenABalance >= mTokenAAmount
            ? mTokenAAmount
            : mTokenABalance;
        //         require(
        //             ManageableVault(address(redemptionVault)).waivedFeeRestriction(
        //                 address(this)
        //             ),
        //             "RVMT: fees not waived on target"
        //         );

        uint256 actualTokenOutAmount = Math.mulDiv(
            mTokenAAmount,
            mTokenARate,
            tokenOutRate,
            Math.Rounding.Down
        );

        if (actualTokenOutAmount == 0) {
            return 0;
        }

        IERC20(mTokenA).safeIncreaseAllowance(
            address(redemptionVault),
            mTokenAAmount
        );

        // redeem may fail for many reasons, so we just catch all the errors
        // and reset the allowance to 0, so the execution will safely fallbacks
        // to the original redemption flow.
        try
            redemptionVault.redeemInstant(
                tokenOut,
                mTokenAAmount,
                actualTokenOutAmount
            )
        {
            return actualTokenOutAmount;
        } catch (bytes memory) {
            // reset the allowance to 0
            IERC20(mTokenA).safeApprove(address(redemptionVault), 0);
            return 0;
        }
    }
}
