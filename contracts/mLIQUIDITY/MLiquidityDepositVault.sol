// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./MLiquidityMidasAccessControlRoles.sol";

/**
 * @title MLiquidityDepositVault
 * @notice Smart contract that handles mLIQUIDITY minting
 * @author RedDuck Software
 */
contract MLiquidityDepositVault is
    DepositVault,
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
