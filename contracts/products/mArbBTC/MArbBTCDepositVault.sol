// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./MArbBTCMidasAccessControlRoles.sol";

/**
 * @title MArbBTCDepositVault
 * @notice Smart contract that handles mArbBTC minting
 * @author RedDuck Software
 */
contract MArbBTCDepositVault is DepositVault, MArbBTCMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_ARB_BTC_DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public pure override returns (bytes32) {
        return M_ARB_GREENLISTED_ROLE;
    }
}
