// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./ObeatUsdMidasAccessControlRoles.sol";

/**
 * @title ObeatUsdDepositVault
 * @notice Smart contract that handles obeatUSD minting
 * @author RedDuck Software
 */
contract ObeatUsdDepositVault is DepositVault, ObeatUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return OBEAT_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
