// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithMorpho.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityRedemptionVaultWithMorpho
 * @notice Smart contract that handles mLIQUIDITY redemptions via Morpho Vault
 * @author RedDuck Software
 */
contract MLiquidityRedemptionVaultWithMorpho is
    RedemptionVaultWithMorpho,
    MLiquidityMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_LIQUIDITY_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
