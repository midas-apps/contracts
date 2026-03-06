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
     * @dev overrides original transfer to tokens receiver function
     * in case of Aave deposits are disabled, it will act as the original transfer
     * otherwise it will take payment tokens from user, supply them to Aave V3 Pool
     * and aTokens will be minted to tokens receiver
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        if (!aaveDepositsEnabled) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        IAaveV3Pool pool = aavePools[tokenIn];
        require(address(pool) != address(0), "DVA: no pool for token");

        uint256 transferredAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        IERC20(tokenIn).safeIncreaseAllowance(address(pool), transferredAmount);
        pool.supply(tokenIn, transferredAmount, tokensReceiver, 0);
    }
}
