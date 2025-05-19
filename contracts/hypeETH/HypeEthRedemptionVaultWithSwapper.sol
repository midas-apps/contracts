// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./HypeEthMidasAccessControlRoles.sol";

/**
 * @title HypeEthRedemptionVaultWithSwapper
 * @notice Smart contract that handles hypeETH redemptions
 * @author RedDuck Software
 */
contract HypeEthRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    HypeEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HYPE_ETH_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
