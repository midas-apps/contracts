// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../RedemptionVaultWithSwapper.sol";
import "./BondEthMidasAccessControlRoles.sol";

/**
 * @title BondEthRedemptionVaultWithSwapper
 * @notice Smart contract that handles bondETH redemptions
 * @author RedDuck Software
 */
contract BondEthRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    BondEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return BOND_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
