// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./SplUsdMidasAccessControlRoles.sol";

/**
 * @title SplUsdDepositVault
 * @notice Smart contract that handles splUSD minting
 * @author RedDuck Software
 */
contract SplUsdDepositVault is DepositVault, SplUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return SPL_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
