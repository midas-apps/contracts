// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../DepositVault.sol";
import "./MM1UsdMidasAccessControlRoles.sol";

/**
 * @title MM1UsdDepositVault
 * @notice Smart contract that handles mM1USD minting
 * @author RedDuck Software
 */
contract MM1UsdDepositVault is DepositVault, MM1UsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_M1_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
