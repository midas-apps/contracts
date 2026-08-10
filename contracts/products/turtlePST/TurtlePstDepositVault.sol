// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./TurtlePstMidasAccessControlRoles.sol";

/**
 * @title TurtlePstDepositVault
 * @notice Smart contract that handles turtlePST minting
 * @author RedDuck Software
 */
contract TurtlePstDepositVault is
    DepositVault,
    TurtlePstMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return TURTLE_PST_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
