// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MEvUsdMidasAccessControlRoles.sol";

/**
 * @title MEvUsdDepositVault
 * @notice Smart contract that handles mEVUSD minting
 * @author RedDuck Software
 */
contract MEvUsdDepositVault is DepositVault, MEvUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_EV_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
