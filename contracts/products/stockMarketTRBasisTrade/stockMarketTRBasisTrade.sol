// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title stockMarketTRBasisTrade
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract stockMarketTRBasisTrade is mToken {
    /**
     * @notice actor that can mint stockMarketTRBasisTrade
     */
    bytes32 public constant STOCK_MARKET_TR_BASIS_TRADE_MINT_OPERATOR_ROLE =
        keccak256("STOCK_MARKET_TR_BASIS_TRADE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn stockMarketTRBasisTrade
     */
    bytes32 public constant STOCK_MARKET_TR_BASIS_TRADE_BURN_OPERATOR_ROLE =
        keccak256("STOCK_MARKET_TR_BASIS_TRADE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause stockMarketTRBasisTrade
     */
    bytes32 public constant STOCK_MARKET_TR_BASIS_TRADE_PAUSE_OPERATOR_ROLE =
        keccak256("STOCK_MARKET_TR_BASIS_TRADE_PAUSE_OPERATOR_ROLE");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc mToken
     */
    function _getNameSymbol()
        internal
        pure
        override
        returns (string memory, string memory)
    {
        return (
            "Morini StockMarketTRBasisTrade Vault",
            "StockMarketTRBasisTrade"
        );
    }

    /**
     * @dev AC role, owner of which can mint stockMarketTRBasisTrade token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return STOCK_MARKET_TR_BASIS_TRADE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn stockMarketTRBasisTrade token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return STOCK_MARKET_TR_BASIS_TRADE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause stockMarketTRBasisTrade token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return STOCK_MARKET_TR_BASIS_TRADE_PAUSE_OPERATOR_ROLE;
    }
}
