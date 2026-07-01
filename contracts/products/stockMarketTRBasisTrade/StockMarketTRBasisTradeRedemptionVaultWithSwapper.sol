// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../RedemptionVaultWithSwapper.sol";
import "./StockMarketTRBasisTradeMidasAccessControlRoles.sol";

/**
 * @title StockMarketTRBasisTradeRedemptionVaultWithSwapper
 * @notice Smart contract that handles stockMarketTRBasisTrade redemptions
 * @author RedDuck Software
 */
contract StockMarketTRBasisTradeRedemptionVaultWithSwapper is
    RedemptionVaultWithSwapper,
    StockMarketTRBasisTradeMidasAccessControlRoles
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure override returns (bytes32) {
        return STOCK_MARKET_TR_BASIS_TRADE_REDEMPTION_VAULT_ADMIN_ROLE;
    }
}
