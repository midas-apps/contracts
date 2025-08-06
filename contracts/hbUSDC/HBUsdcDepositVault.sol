// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./HBUsdcMidasAccessControlRoles.sol";

/**
 * @title HBUsdcDepositVault
 * @notice Smart contract that handles hbUSDC minting
 * @author RedDuck Software
 */
contract HBUsdcDepositVault is DepositVault, HBUsdcMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HB_USDC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
