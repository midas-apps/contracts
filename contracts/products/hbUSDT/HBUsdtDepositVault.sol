// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./HBUsdtMidasAccessControlRoles.sol";

/**
 * @title HBUsdtDepositVault
 * @notice Smart contract that handles hbUSDT minting
 * @author RedDuck Software
 */
contract HBUsdtDepositVault is DepositVault, HBUsdtMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HB_USDT_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
