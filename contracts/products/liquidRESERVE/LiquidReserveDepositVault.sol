// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./LiquidReserveMidasAccessControlRoles.sol";

/**
 * @title LiquidReserveDepositVault
 * @notice Smart contract that handles liquidRESERVE minting
 * @author RedDuck Software
 */
contract LiquidReserveDepositVault is
    DepositVault,
    LiquidReserveMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return LIQUID_RESERVE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
