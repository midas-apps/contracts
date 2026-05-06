// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./WVLPMidasAccessControlRoles.sol";

/**
 * @title WVLPDepositVault
 * @notice Smart contract that handles wVLP minting
 * @author RedDuck Software
 */
contract WVLPDepositVault is DepositVault, WVLPMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return W_VLP_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
