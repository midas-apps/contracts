// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import "./interfaces/aave/IAaveV3Pool.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithAave
 * @notice Smart contract that handles redemptions using Aave V3 Pool withdrawals
 * @dev When the vault has insufficient payment token balance, it withdraws from
 * an Aave V3 Pool by burning its aTokens to obtain the underlying asset.
 * @author RedDuck Software
 */
contract RedemptionVaultWithAave is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice mapping payment token to Aave V3 Pool
     */
    mapping(address => IAaveV3Pool) public aavePools;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when an Aave V3 Pool is configured for a payment token
     * @param caller address of the caller
     * @param token payment token address
     * @param pool Aave V3 Pool address
     */
    event SetAavePool(
        address indexed caller,
        address indexed token,
        address indexed pool
    );

    /**
     * @notice Emitted when an Aave V3 Pool is removed for a payment token
     * @param caller address of the caller
     * @param token payment token address
     */
    event RemoveAavePool(address indexed caller, address indexed token);

    /**
     * @notice Sets the Aave V3 Pool for a specific payment token
     * @param _token payment token address
     * @param _aavePool Aave V3 Pool address for this token
     */
    function setAavePool(address _token, address _aavePool)
        external
        onlyVaultAdmin
    {
        _validateAddress(_token, false);
        _validateAddress(_aavePool, false);
        require(
            IAaveV3Pool(_aavePool).getReserveAToken(_token) != address(0),
            "RVA: token not in pool"
        );
        aavePools[_token] = IAaveV3Pool(_aavePool);
        emit SetAavePool(msg.sender, _token, _aavePool);
    }

    /**
     * @notice Removes the Aave V3 Pool for a specific payment token
     * @param _token payment token address
     */
    function removeAavePool(address _token) external onlyVaultAdmin {
        require(address(aavePools[_token]) != address(0), "RVA: pool not set");
        delete aavePools[_token];
        emit RemoveAavePool(msg.sender, _token);
    }

    /**
     * @dev Redeem mToken to the selected payment token if daily limit and allowance are not exceeded.
     * If the contract doesn't have enough payment token, the Aave V3 withdrawal flow will be
     * triggered to withdraw the missing amount from the Aave Pool.
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

        _checkAndRedeemAave(
            tokenOut,
            calcResult.amountTokenOutWithoutFee.convertFromBase18(
                calcResult.tokenOutDecimals
            )
        );
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, withdraw the missing amount from the Aave V3 Pool
     * @dev The Aave Pool burns the vault's aTokens and transfers the underlying
     * asset directly to this contract. No approval is needed because the Pool
     * burns aTokens from msg.sender (this contract) internally.
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut needed
     */
    function _checkAndRedeemAave(address tokenOut, uint256 amountTokenOut)
        internal
    {
        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        IAaveV3Pool pool = aavePools[tokenOut];
        require(address(pool) != address(0), "RVA: no pool for token");

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;

        address aToken = pool.getReserveAToken(tokenOut);
        require(aToken != address(0), "RVA: token not in Aave pool");

        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));
        require(
            aTokenBalance >= missingAmount,
            "RVA: insufficient aToken balance"
        );

        uint256 withdrawnAmount = pool.withdraw(
            tokenOut,
            missingAmount,
            address(this)
        );
        require(
            withdrawnAmount >= missingAmount,
            "RVA: insufficient withdrawal amount"
        );
    }
}
