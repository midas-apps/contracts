// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MFTacMidasAccessControlRoles.sol";

/**
 * @title MFTacDepositVault
 * @notice Smart contract that handles mFTAC minting
 * @author RedDuck Software
 */
contract MFTacDepositVault is DepositVault, MFTacMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_FTAC_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
