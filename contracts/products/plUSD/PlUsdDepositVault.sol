// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./PlUsdMidasAccessControlRoles.sol";

/**
 * @title PlUsdDepositVault
 * @notice Smart contract that handles plUSD minting
 * @author RedDuck Software
 */
contract PlUsdDepositVault is DepositVault, PlUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return PL_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
