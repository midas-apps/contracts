// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MEvEthMidasAccessControlRoles.sol";

/**
 * @title MEvEthDepositVault
 * @notice Smart contract that handles mEVETH minting
 * @author RedDuck Software
 */
contract MEvEthDepositVault is DepositVault, MEvEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_EV_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
