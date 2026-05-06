// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./DnEthMidasAccessControlRoles.sol";

/**
 * @title DnEthRedemptionVaultWithSwapper
 * @notice Smart contract that handles dnETH redemptions
 * @author RedDuck Software
 */
contract DnEthRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    DnEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DN_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
