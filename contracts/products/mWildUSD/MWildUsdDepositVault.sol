// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MWildUsdMidasAccessControlRoles.sol";

/**
 * @title MWildUsdDepositVault
 * @notice Smart contract that handles mWildUSD minting
 * @author RedDuck Software
 */
contract MWildUsdDepositVault is DepositVault, MWildUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_WILD_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
