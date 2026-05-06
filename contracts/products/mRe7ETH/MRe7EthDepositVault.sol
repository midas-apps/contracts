// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MRe7EthMidasAccessControlRoles.sol";

/**
 * @title MRe7EthDepositVault
 * @notice Smart contract that handles mRe7ETH minting
 * @author RedDuck Software
 */
contract MRe7EthDepositVault is DepositVault, MRe7EthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_RE7ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
