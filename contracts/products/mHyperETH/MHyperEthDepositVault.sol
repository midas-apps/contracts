// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MHyperEthMidasAccessControlRoles.sol";

/**
 * @title MHyperEthDepositVault
 * @notice Smart contract that handles mHyperETH minting
 * @author RedDuck Software
 */
contract MHyperEthDepositVault is
    DepositVault,
    MHyperEthMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_HYPER_ETH_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
