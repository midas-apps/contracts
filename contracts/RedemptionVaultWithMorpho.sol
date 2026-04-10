// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import {IMorphoVault} from "./interfaces/morpho/IMorphoVault.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithMorpho
 * @notice Smart contract that handles redemptions using Morpho Vault withdrawals
 * @dev When the vault has insufficient payment token balance, it withdraws from
 * a Morpho Vault (ERC-4626) by burning its vault shares to obtain the underlying asset.
 * Works with both Morpho Vaults V1 (MetaMorpho) and V2.
 * @author RedDuck Software
 */
contract RedemptionVaultWithMorpho is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice mapping payment token to Morpho Vault
     */
    mapping(address => IMorphoVault) public morphoVaults;

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
     * @notice Sets the Morpho Vault for a specific payment token
     * @param _token payment token address
     * @param _morphoVault Morpho Vault (ERC-4626) address for this token
     */
    function setMorphoVault(address _token, address _morphoVault)
        external
        validateVaultAdminAccess
    {
        _validateAddress(_token, false);
        _validateAddress(_morphoVault, false);
        require(
            IMorphoVault(_morphoVault).asset() == _token,
            "RVM: asset mismatch"
        );
        morphoVaults[_token] = IMorphoVault(_morphoVault);
        emit SetMorphoVault(msg.sender, _token, _morphoVault);
    }

    /**
     * @notice Removes the Morpho Vault for a specific payment token
     * @param _token payment token address
     */
    function removeMorphoVault(address _token)
        external
        validateVaultAdminAccess
    {
        require(
            address(morphoVaults[_token]) != address(0),
            "RVM: vault not set"
        );
        delete morphoVaults[_token];
        emit RemoveMorphoVault(msg.sender, _token);
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, withdraw the missing amount from the Morpho Vault
     * @dev The Morpho Vault burns the vault's shares and transfers the underlying
     * asset directly to this contract. No approval is needed because the vault
     * burns shares from msg.sender (this contract) when msg.sender == owner.
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

        if (contractBalanceTokenOut >= amountTokenOut) {
            return;
        }

        IMorphoVault vault = morphoVaults[tokenOut];
        if (address(vault) == address(0)) {
            return;
        }

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;

        uint256 sharesNeeded = vault.previewWithdraw(missingAmount);
        uint256 vaultSharesBalance = vault.balanceOf(address(this));
        uint256 toRedeemShares = vaultSharesBalance >= sharesNeeded
            ? sharesNeeded
            : vaultSharesBalance;

        vault.redeem(toRedeemShares, address(this), address(this));
    }
}
