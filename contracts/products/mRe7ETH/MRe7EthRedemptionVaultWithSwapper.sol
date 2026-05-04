// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../RedemptionVaultWithSwapper.sol";
import "./MRe7EthMidasAccessControlRoles.sol";

/**
 * @title MRe7EthRedemptionVaultWithSwapper
 * @notice Smart contract that handles mRe7ETH redemptions
 * @author RedDuck Software
 */
contract MRe7EthRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MRe7EthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
