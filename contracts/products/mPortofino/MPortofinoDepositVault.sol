// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MPortofinoMidasAccessControlRoles.sol";

/**
 * @title MPortofinoDepositVault
 * @notice Smart contract that handles mPortofino minting
 * @author RedDuck Software
 */
contract MPortofinoDepositVault is
    DepositVault,
    MPortofinoMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_PORTOFINO_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
