// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

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
     * @param _redemptionInitParams init params for redemption vault state values
     * @param _ustbRedemption USTB redemption contract address
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        RedemptionVaultInitParams calldata _redemptionInitParams,
        address _ustbRedemption
    ) external {
        initialize(_commonVaultInitParams, _redemptionInitParams);
        _validateAddress(_ustbRedemption, false);
        ustbRedemption = IUSTBRedemption(_ustbRedemption);
    }

    /**
     * @notice Check if contract has enough USDC balance for redeem
     * if not, trigger USTB redemption flow to redeem exactly the missing amount
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param currentTokenOutBalanceBase18 current balance of tokenOut in the vault in base 18
     * @param tokenOutDecimals decimals of tokenOut
     */
    function _useVaultLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256, /* tokenOutRate */
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    )
        internal
        virtual
        override
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        // If tokenOut is not USDC, do nothing
        if (tokenOut != ustbRedemption.USDC()) {
            return 0;
        }

        uint256 missingAmount = missingAmountBase18.convertFromBase18(
            tokenOutDecimals
        );

        IUSTBRedemption _ustbRedemption = ustbRedemption;

        uint256 fee = _ustbRedemption.calculateFee(missingAmount);

        // If fee is not zero, do nothing
        if (fee != 0) {
            return 0;
        }

        (uint256 ustbToRedeem, ) = _ustbRedemption.calculateUstbIn(
            missingAmount
        );

        IERC20 ustb = IERC20(_ustbRedemption.SUPERSTATE_TOKEN());
        uint256 ustbBalance = ustb.balanceOf(address(this));

        ustbToRedeem = ustbBalance >= ustbToRedeem ? ustbToRedeem : ustbBalance;

        // if nothing to redeem, do nothing
        if (ustbToRedeem == 0) {
            return 0;
        }

        ustb.safeIncreaseAllowance(address(_ustbRedemption), ustbToRedeem);
        _ustbRedemption.redeem(ustbToRedeem);

        return
            IERC20(tokenOut).balanceOf(address(this)).convertToBase18(
                tokenOutDecimals
            ) - currentTokenOutBalanceBase18;
    }
}
