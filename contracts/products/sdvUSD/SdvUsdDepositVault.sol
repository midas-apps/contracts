// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./SdvUsdMidasAccessControlRoles.sol";

/**
 * @title SdvUsdDepositVault
 * @notice Smart contract that handles sdvUSD minting
 * @author RedDuck Software
 */
contract SdvUsdDepositVault is DepositVault, SdvUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return SDV_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
