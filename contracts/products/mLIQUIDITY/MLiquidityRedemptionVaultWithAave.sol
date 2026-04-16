// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithAave.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityRedemptionVaultWithAave
 * @notice Smart contract that handles mLIQUIDITY redemptions via Aave V3
 * @author RedDuck Software
 */
contract MLiquidityRedemptionVaultWithAave is
    RedemptionVaultWithAave,
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
