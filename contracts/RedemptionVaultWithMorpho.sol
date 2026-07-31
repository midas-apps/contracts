// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {RedemptionVault} from "./RedemptionVault.sol";

import {IMorphoVault} from "./interfaces/morpho/IMorphoVault.sol";
import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";

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
     * @param token payment token address
     * @param vault Morpho Vault address
     */
    event SetMorphoVault(address indexed token, address indexed vault);

    /**
     * @notice Emitted when a Morpho Vault is removed for a payment token
     * @param token payment token address
     */
    event RemoveMorphoVault(address indexed token);

    /**
     * @notice when asset mismatch
     * @param morphoVault Morpho Vault address
     * @param token token address
     */
    error AssetMismatch(address morphoVault, address token);

    /**
     * @notice when vault is not set
     * @param token token address
     */
    error VaultNotSet(address token);

    /**
     * @notice Passes role identifiers to the base RedemptionVault constructor
     * @param _contractAdminRole contract admin role identifier
     * @param _greenlistedRole greenlisted role identifier
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole)
        RedemptionVault(_contractAdminRole, _greenlistedRole)
    {}

    /**
     * @notice Sets the Morpho Vault for a specific payment token
     * @param _token payment token address
     * @param _morphoVault Morpho Vault (ERC-4626) address for this token
     */
    function setMorphoVault(address _token, address _morphoVault)
        external
        onlyContractAdmin
    {
        _validateAddress(_token, true);
        _validateAddress(_morphoVault, true);
        require(
            IMorphoVault(_morphoVault).asset() == _token,
            AssetMismatch(_morphoVault, _token)
        );
        morphoVaults[_token] = IMorphoVault(_morphoVault);
        emit SetMorphoVault(_token, _morphoVault);
    }

    /**
     * @notice Removes the Morpho Vault for a specific payment token
     * @param _token payment token address
     */
    function removeMorphoVault(address _token) external onlyContractAdmin {
        require(
            address(morphoVaults[_token]) != address(0),
            VaultNotSet(_token)
        );
        delete morphoVaults[_token];
        emit RemoveMorphoVault(_token);
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, withdraw the missing amount from the Morpho Vault
     * @dev The Morpho Vault burns the vault's shares and transfers the underlying
     * asset directly to this contract. No approval is needed because the vault
     * burns shares from msg.sender (this contract) when msg.sender == owner.
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutDecimals decimals of tokenOut
     */
    function _obtainVaultLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256, /* tokenOutRate */
        uint256, /* currentTokenOutBalanceBase18 */
        uint256 tokenOutDecimals
    )
        internal
        virtual
        override
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        IMorphoVault vault = morphoVaults[tokenOut];

        if (address(vault) == address(0)) {
            return 0;
        }

        uint256 missingAmount = missingAmountBase18.convertFromBase18(
            tokenOutDecimals
        );

        uint256 sharesNeeded = vault.previewWithdraw(missingAmount);
        uint256 vaultSharesBalance = vault.balanceOf(address(this));
        uint256 toRedeemShares = vaultSharesBalance >= sharesNeeded
            ? sharesNeeded
            : vaultSharesBalance;

        if (toRedeemShares == 0) {
            return 0;
        }

        return
            vault
                .redeem(toRedeemShares, address(this), address(this))
                .convertToBase18(tokenOutDecimals);
    }
}
