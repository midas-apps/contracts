// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../RedemptionVaultWithSwapper.sol";
import "./MM1UsdMidasAccessControlRoles.sol";

/**
 * @title MM1UsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles mM1USD redemptions
 * @author RedDuck Software
 */
contract MM1UsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MM1UsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_M1_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
