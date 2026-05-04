// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../DepositVault.sol";
import "./BondUsdMidasAccessControlRoles.sol";

/**
 * @title BondUsdDepositVault
 * @notice Smart contract that handles bondUSD minting
 * @author RedDuck Software
 */
contract BondUsdDepositVault is DepositVault, BondUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return BOND_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
