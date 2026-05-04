// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../DepositVault.sol";
import "./MTestMidasAccessControlRoles.sol";

/**
 * @title MTestDepositVault
 * @notice Smart contract that handles mTEST minting
 * @author RedDuck Software
 */
contract MTestDepositVault is DepositVault, MTestMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_TEST_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_TEST_GREENLISTED_ROLE;
    }
}
