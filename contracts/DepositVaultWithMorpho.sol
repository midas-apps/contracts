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
     * @dev overrides original transfer to tokens receiver function
     * in case of Morpho deposits are disabled, it will act as the original transfer
     * otherwise it will take payment tokens from user, deposit them into Morpho Vault
     * and vault shares will be minted to tokens receiver
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        if (!morphoDepositsEnabled) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        IMorphoVault vault = morphoVaults[tokenIn];
        require(address(vault) != address(0), "DVM: no vault for token");

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
        uint256 shares = vault.deposit(transferredAmount, tokensReceiver);
        require(shares > 0, "DVM: zero shares");
    }
}
