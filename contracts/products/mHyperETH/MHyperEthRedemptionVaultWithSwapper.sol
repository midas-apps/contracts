// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./MHyperEthMidasAccessControlRoles.sol";

/**
 * @title MHyperEthRedemptionVaultWithSwapper
 * @notice Smart contract that handles mHyperETH redemptions
 * @author RedDuck Software
 */
contract MHyperEthRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MHyperEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_HYPER_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
