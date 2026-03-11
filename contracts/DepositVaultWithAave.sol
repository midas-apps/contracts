// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./DepositVault.sol";
import "./interfaces/aave/IAaveV3Pool.sol";

/**
 * @title DepositVaultWithAave
 * @notice Smart contract that handles mToken minting and invests
 * proceeds into Aave V3 Pool
 * @dev If `aaveDepositsEnabled` is false, regular deposit flow is used
 * @author RedDuck Software
 */
contract DepositVaultWithAave is DepositVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice mapping payment token to Aave V3 Pool
     */
    mapping(address => IAaveV3Pool) public aavePools;

    /**
     * @notice Whether Aave auto-invest deposits are enabled
     * @dev if false, regular deposit flow will be used
     */
    bool public aaveDepositsEnabled;

    /**
     * @notice Whether to fall back to raw token transfer on auto-invest failure
     * @dev if false, the transaction will revert when auto-invest fails
     */
    bool public autoInvestFallbackEnabled;

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
     * @notice Emitted when `aaveDepositsEnabled` flag is updated
     * @param enabled Whether Aave deposits are enabled
     */
    event SetAaveDepositsEnabled(bool indexed enabled);

    /**
     * @notice Emitted when `autoInvestFallbackEnabled` flag is updated
     * @param enabled Whether fallback to raw transfer is enabled
     */
    event SetAutoInvestFallbackEnabled(bool indexed enabled);

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
            "DVA: token not in pool"
        );
        aavePools[_token] = IAaveV3Pool(_aavePool);
        emit SetAavePool(msg.sender, _token, _aavePool);
    }

    /**
     * @notice Removes the Aave V3 Pool for a specific payment token
     * @param _token payment token address
     */
    function removeAavePool(address _token) external onlyVaultAdmin {
        require(address(aavePools[_token]) != address(0), "DVA: pool not set");
        delete aavePools[_token];
        emit RemoveAavePool(msg.sender, _token);
    }

    /**
     * @notice Updates `aaveDepositsEnabled` value
     * @param enabled whether Aave auto-invest deposits are enabled
     */
    function setAaveDepositsEnabled(bool enabled) external onlyVaultAdmin {
        aaveDepositsEnabled = enabled;
        emit SetAaveDepositsEnabled(enabled);
    }

    /**
     * @notice Updates `autoInvestFallbackEnabled` value
     * @param enabled whether fallback to raw transfer is enabled on auto-invest failure
     */
    function setAutoInvestFallbackEnabled(bool enabled)
        external
        onlyVaultAdmin
    {
        autoInvestFallbackEnabled = enabled;
        emit SetAutoInvestFallbackEnabled(enabled);
    }

    /**
     * @dev overrides instant deposit transfer hook to auto-invest into Aave
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        IAaveV3Pool pool = aavePools[tokenIn];
        if (!aaveDepositsEnabled || address(pool) == address(0)) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        _autoInvest(tokenIn, amountToken, tokensDecimals);
    }

    /**
     * @dev overrides request deposit transfer hook to auto-invest into Aave
     */
    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        IAaveV3Pool pool = aavePools[tokenIn];
        if (!aaveDepositsEnabled || address(pool) == address(0)) {
            return
                super._requestTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        _autoInvest(tokenIn, amountToken, tokensDecimals);
    }

    /**
     * @dev Transfers tokens from user to this contract and supplies them
     * to the Aave V3 Pool. On failure, either falls back to raw transfer
     * or reverts based on `autoInvestFallbackEnabled`.
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _autoInvest(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) private {
        IAaveV3Pool pool = aavePools[tokenIn];

        uint256 transferredAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        IERC20(tokenIn).safeIncreaseAllowance(address(pool), transferredAmount);

        try
            pool.supply(tokenIn, transferredAmount, tokensReceiver, 0)
        {} catch {
            if (autoInvestFallbackEnabled) {
                IERC20(tokenIn).safeApprove(address(pool), 0);
                IERC20(tokenIn).safeTransfer(tokensReceiver, transferredAmount);
            } else {
                revert("DVA: auto-invest failed");
            }
        }
    }
}
