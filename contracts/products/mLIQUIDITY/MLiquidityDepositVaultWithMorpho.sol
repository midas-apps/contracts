// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVaultWithMorpho.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityDepositVaultWithMorpho
 * @notice Smart contract that handles mLIQUIDITY minting with Morpho auto-invest
 * @author RedDuck Software
 */
contract MLiquidityDepositVaultWithMorpho is
    DepositVaultWithMorpho,
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
