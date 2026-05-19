// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title carryTradeUSDTRYLeverage
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract carryTradeUSDTRYLeverage is mToken {
    /**
     * @notice actor that can mint carryTradeUSDTRYLeverage
     */
    bytes32 public constant CARRY_TRADE_USD_TRY_LEVERAGE_MINT_OPERATOR_ROLE =
        keccak256("CARRY_TRADE_USD_TRY_LEVERAGE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn carryTradeUSDTRYLeverage
     */
    bytes32 public constant CARRY_TRADE_USD_TRY_LEVERAGE_BURN_OPERATOR_ROLE =
        keccak256("CARRY_TRADE_USD_TRY_LEVERAGE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause carryTradeUSDTRYLeverage
     */
    bytes32 public constant CARRY_TRADE_USD_TRY_LEVERAGE_PAUSE_OPERATOR_ROLE =
        keccak256("CARRY_TRADE_USD_TRY_LEVERAGE_PAUSE_OPERATOR_ROLE");

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
            "Morini CarryTradeUSDTRYLeverage Vault",
            "CarryTradeUSDTRYLeverage"
        );
    }

    /**
     * @dev AC role, owner of which can mint carryTradeUSDTRYLeverage token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return CARRY_TRADE_USD_TRY_LEVERAGE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn carryTradeUSDTRYLeverage token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return CARRY_TRADE_USD_TRY_LEVERAGE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause carryTradeUSDTRYLeverage token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return CARRY_TRADE_USD_TRY_LEVERAGE_PAUSE_OPERATOR_ROLE;
    }
}
