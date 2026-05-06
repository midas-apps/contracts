// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../../RedemptionVaultWithSwapper.sol";
import "./MBasisMidasAccessControlRoles.sol";

/**
 * @title MBasisRedemptionVault
 * @notice Smart contract that handles mBASIS redemptions
 * @author RedDuck Software
 */
contract MBasisRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    MBasisMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return M_BASIS_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
