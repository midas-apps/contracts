// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./HypeBtcMidasAccessControlRoles.sol";

/**
 * @title HypeBtcDepositVault
 * @notice Smart contract that handles hypeBTC minting
 * @author RedDuck Software
 */
contract HypeBtcDepositVault is DepositVault, HypeBtcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HYPE_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
