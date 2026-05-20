// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../DepositVault.sol";
import "./StockMarketTRBasisTradeMidasAccessControlRoles.sol";

/**
 * @title StockMarketTRBasisTradeDepositVault
 * @notice Smart contract that handles stockMarketTRBasisTrade minting
 * @author RedDuck Software
 */
contract StockMarketTRBasisTradeDepositVault is
    DepositVault,
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
        return STOCK_MARKET_TR_BASIS_TRADE_DEPOSIT_VAULT_ADMIN_ROLE;
    }
}
