// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MFOneMidasAccessControlRoles.sol";

/**
 * @title MFOneDepositVault
 * @notice Smart contract that handles mF-ONE minting
 * @author RedDuck Software
 */
contract MFOneDepositVault is DepositVault, MFOneMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FONE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
