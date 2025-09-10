// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./ZeroGEthvMidasAccessControlRoles.sol";

/**
 * @title ZeroGEthvRedemptionVaultWithSwapper
 * @notice Smart contract that handles zeroGETHV redemptions
 * @author RedDuck Software
 */
contract ZeroGEthvRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    ZeroGEthvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ZEROG_ETHV_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
