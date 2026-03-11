// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./DepositVault.sol";
import {IMorphoVault} from "./interfaces/morpho/IMorphoVault.sol";

/**
 * @title DepositVaultWithMorpho
 * @notice Smart contract that handles mToken minting and invests
 * proceeds into Morpho Vaults
 * @dev If `morphoDepositsEnabled` is false, regular deposit flow is used
 * @author RedDuck Software
 */
contract DepositVaultWithMorpho is DepositVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice mapping payment token to Morpho Vault
     */
    mapping(address => IMorphoVault) public morphoVaults;

    /**
     * @notice Whether Morpho auto-invest deposits are enabled
     * @dev if false, regular deposit flow will be used
     */
    bool public morphoDepositsEnabled;

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
     * @notice Emitted when a Morpho Vault is configured for a payment token
     * @param caller address of the caller
     * @param token payment token address
     * @param vault Morpho Vault address
     */
    event SetMorphoVault(
        address indexed caller,
        address indexed token,
        address indexed vault
    );

    /**
     * @notice Emitted when a Morpho Vault is removed for a payment token
     * @param caller address of the caller
     * @param token payment token address
     */
    event RemoveMorphoVault(address indexed caller, address indexed token);

    /**
     * @notice Emitted when `morphoDepositsEnabled` flag is updated
     * @param enabled Whether Morpho deposits are enabled
     */
    event SetMorphoDepositsEnabled(bool indexed enabled);

    /**
     * @notice Emitted when `autoInvestFallbackEnabled` flag is updated
     * @param enabled Whether fallback to raw transfer is enabled
     */
    event SetAutoInvestFallbackEnabled(bool indexed enabled);

    /**
     * @notice Sets the Morpho Vault for a specific payment token
     * @param _token payment token address
     * @param _morphoVault Morpho Vault (ERC-4626) address for this token
     */
    function setMorphoVault(address _token, address _morphoVault)
        external
        onlyVaultAdmin
    {
        _validateAddress(_token, false);
        _validateAddress(_morphoVault, false);
        require(
            IMorphoVault(_morphoVault).asset() == _token,
            "DVM: asset mismatch"
        );
        morphoVaults[_token] = IMorphoVault(_morphoVault);
        emit SetMorphoVault(msg.sender, _token, _morphoVault);
    }

    /**
     * @notice Removes the Morpho Vault for a specific payment token
     * @param _token payment token address
     */
    function removeMorphoVault(address _token) external onlyVaultAdmin {
        require(
            address(morphoVaults[_token]) != address(0),
            "DVM: vault not set"
        );
        delete morphoVaults[_token];
        emit RemoveMorphoVault(msg.sender, _token);
    }

    /**
     * @notice Updates `morphoDepositsEnabled` value
     * @param enabled whether Morpho auto-invest deposits are enabled
     */
    function setMorphoDepositsEnabled(bool enabled) external onlyVaultAdmin {
        morphoDepositsEnabled = enabled;
        emit SetMorphoDepositsEnabled(enabled);
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
     * @dev overrides instant deposit transfer hook to auto-invest into Morpho
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        IMorphoVault vault = morphoVaults[tokenIn];
        if (!morphoDepositsEnabled || address(vault) == address(0)) {
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
     * @dev overrides request deposit transfer hook to auto-invest into Morpho
     */
    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        IMorphoVault vault = morphoVaults[tokenIn];
        if (!morphoDepositsEnabled || address(vault) == address(0)) {
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
     * @dev Transfers tokens from user to this contract and deposits them
     * into the Morpho Vault. On failure, either falls back to raw transfer
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
        IMorphoVault vault = morphoVaults[tokenIn];

        uint256 transferredAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        IERC20(tokenIn).safeIncreaseAllowance(
            address(vault),
            transferredAmount
        );

        try vault.deposit(transferredAmount, tokensReceiver) returns (
            uint256 shares
        ) {
            require(shares > 0, "DVM: zero shares");
        } catch {
            if (autoInvestFallbackEnabled) {
                IERC20(tokenIn).safeApprove(address(vault), 0);
                IERC20(tokenIn).safeTransfer(tokensReceiver, transferredAmount);
            } else {
                revert("DVM: auto-invest failed");
            }
        }
    }
}
