// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title obeatUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract obeatUSD is mToken {
    /**
     * @notice actor that can mint obeatUSD
     */
    bytes32 public constant OBEAT_USD_MINT_OPERATOR_ROLE =
        keccak256("OBEAT_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn obeatUSD
     */
    bytes32 public constant OBEAT_USD_BURN_OPERATOR_ROLE =
        keccak256("OBEAT_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause obeatUSD
     */
    bytes32 public constant OBEAT_USD_PAUSE_OPERATOR_ROLE =
        keccak256("OBEAT_USD_PAUSE_OPERATOR_ROLE");

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
        return ("OmniBeat USD", "obeatUSD");
    }

    /**
     * @dev AC role, owner of which can mint obeatUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return OBEAT_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn obeatUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return OBEAT_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause obeatUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return OBEAT_USD_PAUSE_OPERATOR_ROLE;
    }
}
