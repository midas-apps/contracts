// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./HypeUsdMidasAccessControlRoles.sol";

/**
 * @title HypeUsdDepositVault
 * @notice Smart contract that handles hypeUSD minting
 * @author RedDuck Software
 */
contract HypeUsdDepositVault is DepositVault, HypeUsdMidasAccessControlRoles {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return HYPE_USD_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
