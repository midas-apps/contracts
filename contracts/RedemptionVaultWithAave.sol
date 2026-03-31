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
        validateVaultAdminAccess
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
    function removeAavePool(address _token) external validateVaultAdminAccess {
        require(address(aavePools[_token]) != address(0), "RVA: pool not set");
        delete aavePools[_token];
        emit RemoveAavePool(msg.sender, _token);
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, withdraw the missing amount from the Aave V3 Pool
     * @dev The Aave Pool burns the vault's aTokens and transfers the underlying
     * asset directly to this contract. No approval is needed because the Pool
     * burns aTokens from msg.sender (this contract) internally.
     * @param tokenOut tokenOut address
     * @param calcResult calculated redeem instant result
     */
    function _postRedeemInstant(
        address tokenOut,
        CalcAndValidateRedeemResult memory calcResult
    ) internal virtual override {
        uint256 amountTokenOut = calcResult.amountTokenOut.convertFromBase18(
            calcResult.tokenOutDecimals
        );

        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        IAaveV3Pool pool = aavePools[tokenOut];

        // if we dont have a pool for the token, we can't withdraw, so do nothing
        if (address(pool) == address(0)) {
            return;
        }

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;

        address aToken = pool.getReserveAToken(tokenOut);

        // if we cant find the aToken, we can't withdraw, so do nothing
        if (aToken == address(0)) {
            return;
        }

        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));

        uint256 toWithdraw = aTokenBalance >= missingAmount
            ? missingAmount
            : aTokenBalance;

        uint256 withdrawnAmount = pool.withdraw(
            tokenOut,
            toWithdraw,
            address(this)
        );
        require(
            withdrawnAmount >= toWithdraw,
            "RVA: insufficient withdrawal amount"
        );
    }
}
