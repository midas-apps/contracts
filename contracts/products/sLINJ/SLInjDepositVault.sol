// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./SLInjMidasAccessControlRoles.sol";

/**
 * @title SLInjDepositVault
 * @notice Smart contract that handles sLINJ minting
 * @author RedDuck Software
 */
contract SLInjDepositVault is DepositVault, SLInjMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return SL_INJ_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
