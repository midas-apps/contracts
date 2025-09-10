// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";
import "./ZeroGEthvMidasAccessControlRoles.sol";

/**
 * @title ZeroGEthvDepositVault
 * @notice Smart contract that handles zeroGETHV minting
 * @author RedDuck Software
 */
contract ZeroGEthvDepositVault is
    DepositVault,
    ZeroGEthvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ZEROG_ETHV_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
