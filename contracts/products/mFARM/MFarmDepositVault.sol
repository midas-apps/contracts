// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MFarmMidasAccessControlRoles.sol";

/**
 * @title MFarmDepositVault
 * @notice Smart contract that handles mFARM minting
 * @author RedDuck Software
 */
contract MFarmDepositVault is DepositVault, MFarmMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FARM_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
