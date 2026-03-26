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
     * @param _redemptionInitParams init params for redemption vault state values
     * @param _ustbRedemption USTB redemption contract address
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        RedemptionInitParams calldata _redemptionInitParams,
        address _ustbRedemption
    ) external initializer {
        __RedemptionVault_init(
            _commonVaultInitParams,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _redemptionInitParams
        );
        _validateAddress(_ustbRedemption, false);
        ustbRedemption = IUSTBRedemption(_ustbRedemption);
    }

    /**
     * @notice Check if contract has enough USDC balance for redeem
     * if not, trigger USTB redemption flow to redeem exactly the missing amount
     * @param tokenOut tokenOut address
     * @param calcResult calculated redeem instant result
     */
    function _postRedeemInstant(
        address tokenOut,
        CalcAndValidateRedeemResult memory calcResult
    ) internal override {
        uint256 amountTokenOut = calcResult.amountTokenOut.convertFromBase18(
            calcResult.tokenOutDecimals
        );

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
