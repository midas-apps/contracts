// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./KitUsdMidasAccessControlRoles.sol";

/**
 * @title KitUsdDepositVault
 * @notice Smart contract that handles kitUSD minting
 * @author RedDuck Software
 */
contract KitUsdDepositVault is DepositVault, KitUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KIT_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
