// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MHyperBtcMidasAccessControlRoles.sol";

/**
 * @title MHyperBtcDepositVault
 * @notice Smart contract that handles mHyperBTC minting
 * @author RedDuck Software
 */
contract MHyperBtcDepositVault is
    DepositVault,
    MHyperBtcMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_HYPER_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
