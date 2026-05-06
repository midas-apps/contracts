// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./ZeroGBtcvMidasAccessControlRoles.sol";

/**
 * @title ZeroGBtcvDepositVault
 * @notice Smart contract that handles zeroGBTCV minting
 * @author RedDuck Software
 */
contract ZeroGBtcvDepositVault is
    DepositVault,
    ZeroGBtcvMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return ZEROG_BTCV_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
