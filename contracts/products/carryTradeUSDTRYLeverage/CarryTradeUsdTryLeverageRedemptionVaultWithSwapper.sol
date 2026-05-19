// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./CarryTradeUsdTryLeverageMidasAccessControlRoles.sol";

/**
 * @title CarryTradeUsdTryLeverageRedemptionVaultWithSwapper
 * @notice Smart contract that handles carryTradeUSDTRYLeverage redemptions
 * @author RedDuck Software
 */
contract CarryTradeUsdTryLeverageRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
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
        return CARRY_TRADE_USD_TRY_LEVERAGE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
