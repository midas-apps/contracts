// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./WNlpMidasAccessControlRoles.sol";

/**
 * @title WNlpRedemptionVaultWithSwapper
 * @notice Smart contract that handles wNLP redemptions
 * @author RedDuck Software
 */
contract WNlpRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    WNlpMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return W_NLP_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
