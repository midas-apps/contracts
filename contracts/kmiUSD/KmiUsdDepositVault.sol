// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./KmiUsdMidasAccessControlRoles.sol";

/**
 * @title KmiUsdDepositVault
 * @notice Smart contract that handles kmiUSD minting
 * @author RedDuck Software
 */
contract KmiUsdDepositVault is DepositVault, KmiUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return KMI_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
