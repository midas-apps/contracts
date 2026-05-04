// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../DepositVaultWithAave.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityDepositVaultWithAave
 * @notice Smart contract that handles mLIQUIDITY minting with Aave V3 auto-invest
 * @author RedDuck Software
 */
contract MLiquidityDepositVaultWithAave is
    DepositVaultWithAave,
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
        return M_LIQUIDITY_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
