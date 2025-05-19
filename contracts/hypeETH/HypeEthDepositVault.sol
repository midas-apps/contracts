// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./HypeEthMidasAccessControlRoles.sol";

/**
 * @title HypeEthDepositVault
 * @notice Smart contract that handles hypeETH minting
 * @author RedDuck Software
 */
contract HypeEthDepositVault is DepositVault, HypeEthMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HYPE_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
