// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./AcreMBtc1MidasAccessControlRoles.sol";

/**
 * @title AcreMBtc1DepositVault
 * @notice Smart contract that handles acremBTC1 minting
 * @author RedDuck Software
 */
contract AcreMBtc1DepositVault is
    DepositVault,
    AcreMBtc1MidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ACRE_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
