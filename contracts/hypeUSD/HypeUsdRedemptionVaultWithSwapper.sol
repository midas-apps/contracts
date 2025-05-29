// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithSwapper.sol";
import "./HypeUsdMidasAccessControlRoles.sol";

/**
 * @title HypeUsdRedemptionVaultWithSwapper
 * @notice Smart contract that handles hypeUSD redemptions
 * @author RedDuck Software
 */
contract HypeUsdRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    HypeUsdMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HYPE_USD_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
