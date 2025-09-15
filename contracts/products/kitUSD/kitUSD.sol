// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title kitUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract kitUSD is mToken {
    /**
     * @notice actor that can mint kitUSD
     */
    bytes32 public constant KIT_USD_MINT_OPERATOR_ROLE =
        keccak256("KIT_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn kitUSD
     */
    bytes32 public constant KIT_USD_BURN_OPERATOR_ROLE =
        keccak256("KIT_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause kitUSD
     */
    bytes32 public constant KIT_USD_PAUSE_OPERATOR_ROLE =
        keccak256("KIT_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Kitchen Pre-deposit $kitUSD", "$kitUSD");
    }

    /**
     * @dev AC role, owner of which can mint kitUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return KIT_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn kitUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return KIT_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause kitUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return KIT_USD_PAUSE_OPERATOR_ROLE;
    }
}
