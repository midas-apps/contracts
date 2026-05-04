// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../RedemptionVaultWithSwapper.sol";
import "./BondUsdMidasAccessControlRoles.sol";

/**
 * @title BondUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles bondUSD redemptions
 * @author RedDuck Software
 */
contract BondUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    BondUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return BOND_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
