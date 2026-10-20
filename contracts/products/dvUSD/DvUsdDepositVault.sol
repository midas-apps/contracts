// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./DvUsdMidasAccessControlRoles.sol";

/**
 * @title DvUsdDepositVault
 * @notice Smart contract that handles dvUSD minting
 * @author RedDuck Software
 */
contract DvUsdDepositVault is DepositVault, DvUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return DV_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
