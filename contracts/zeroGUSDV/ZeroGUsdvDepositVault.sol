// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./ZeroGUsdvMidasAccessControlRoles.sol";

/**
 * @title ZeroGUsdvDepositVault
 * @notice Smart contract that handles zeroGUSDV minting
 * @author RedDuck Software
 */
contract ZeroGUsdvDepositVault is
    DepositVault,
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
        return ZEROG_USDV_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
