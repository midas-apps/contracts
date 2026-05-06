// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVault.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityRedemptionVault
 * @notice Smart contract that handles mLIQUIDITY redemptions
 * @author RedDuck Software
 */
contract MLiquidityRedemptionVault is
    RedemptionVault,
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
