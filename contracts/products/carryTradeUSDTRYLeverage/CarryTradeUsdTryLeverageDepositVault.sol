// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./CarryTradeUsdTryLeverageMidasAccessControlRoles.sol";

/**
 * @title CarryTradeUsdTryLeverageDepositVault
 * @notice Smart contract that handles carryTradeUSDTRYLeverage minting
 * @author RedDuck Software
 */
contract CarryTradeUsdTryLeverageDepositVault is
    DepositVault,
    CarryTradeUsdTryLeverageMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return CARRY_TRADE_USD_TRY_LEVERAGE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
