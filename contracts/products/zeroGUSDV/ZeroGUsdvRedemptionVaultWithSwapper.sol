// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./ZeroGUsdvMidasAccessControlRoles.sol";

/**
 * @title ZeroGUsdvRedemptionVaultWithSwapper
 * @notice Smart contract that handles zeroGUSDV redemptions
 * @author RedDuck Software
 */
contract ZeroGUsdvRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    ZeroGUsdvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ZEROG_USDV_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
