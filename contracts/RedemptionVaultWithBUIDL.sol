// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import "./interfaces/buidl/IRedemption.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mToken redemptions
 * @author RedDuck Software
 */
contract RedemptionVaultWIthBUIDL is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice minimum amount of BUIDL to redeem. Will redeem at least this amount of BUIDL.
     */
    uint256 public minBuidlToRedeem;

    uint256 public minBuidlBalance;

    IRedemption public buidlRedemption;

    uint256[50] private __gap;

    /**
     * @param minBuidlToRedeem new min amount of BUIDL to redeem
     * @param sender address who set new min amount of BUIDL to redeem
     */
    event SetMinBuidlToRedeem(uint256 minBuidlToRedeem, address sender);

    /**
     * @param minBuidlBalance new `minBuidlBalance` value
     * @param sender address who set new `minBuidlBalance`
     */
    event SetMinBuidlBalance(uint256 minBuidlBalance, address sender);

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _redemptionInitParams init params for redemption vault state values
     * @param _buidlRedemption BUIDL redemption contract address
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        RedemptionInitParams calldata _redemptionInitParams,
        address _buidlRedemption,
        uint256 _minBuidlToRedeem,
        uint256 _minBuidlBalance
    ) external initializer {
        __RedemptionVault_init(
            _commonVaultInitParams,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _redemptionInitParams
        );
        _validateAddress(_buidlRedemption, false);
        buidlRedemption = IRedemption(_buidlRedemption);
        minBuidlToRedeem = _minBuidlToRedeem;
        minBuidlBalance = _minBuidlBalance;
    }

    /**
     * @notice set min amount of BUIDL to redeem.
     * @param _minBuidlToRedeem min amount of BUIDL to redeem
     */
    function setMinBuidlToRedeem(uint256 _minBuidlToRedeem)
        external
        onlyVaultAdmin
    {
        minBuidlToRedeem = _minBuidlToRedeem;

        emit SetMinBuidlToRedeem(_minBuidlToRedeem, msg.sender);
    }

    /**
     * @notice set new `minBuidlBalance` value.
     * @param _minBuidlBalance new `minBuidlBalance` value
     */
    function setMinBuidlBalance(uint256 _minBuidlBalance)
        external
        onlyVaultAdmin
    {
        minBuidlBalance = _minBuidlBalance;

        emit SetMinBuidlBalance(_minBuidlBalance, msg.sender);
    }

    /**
     * @notice Check if contract have enough USDC balance for redeem
     * if don't have trigger BUIDL redemption flow
     * @param tokenOut tokenOut address
     * @param calcResult calculated redeem instant result
     */
    function _postRedeemInstant(
        address tokenOut,
        CalcAndValidateRedeemResult memory calcResult
    ) internal override {
        uint256 amountTokenOut = calcResult
            .amountTokenOutWithoutFee
            .convertFromBase18(calcResult.tokenOutDecimals);

        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        uint256 buidlToRedeem = amountTokenOut - contractBalanceTokenOut;
        if (buidlToRedeem < minBuidlToRedeem) {
            buidlToRedeem = minBuidlToRedeem;
        }
        IERC20 buidl = IERC20(buidlRedemption.asset());
        uint256 buidlBalance = buidl.balanceOf(address(this));
        require(buidlBalance >= buidlToRedeem, "RVB: buidlToRedeem > balance");
        if (
            buidlBalance - buidlToRedeem <= minBuidlToRedeem ||
            buidlBalance - buidlToRedeem <= minBuidlBalance
        ) {
            buidlToRedeem = buidlBalance;
        }
        buidl.safeIncreaseAllowance(address(buidlRedemption), buidlToRedeem);
        buidlRedemption.redeem(buidlToRedeem);
    }
}
