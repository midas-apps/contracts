// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./CUsdoMidasAccessControlRoles.sol";

/**
 * @title CUsdoRedemptionVaultWithSwapper
 * @notice Smart contract that handles cUSDO redemptions
 * @author RedDuck Software
 */
contract CUsdoRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    CUsdoMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return C_USDO_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
