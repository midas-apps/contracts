// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title plUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract plUSD is mToken {
    /**
     * @notice actor that can mint plUSD
     */
    bytes32 public constant PL_USD_MINT_OPERATOR_ROLE =
        keccak256("PL_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn plUSD
     */
    bytes32 public constant PL_USD_BURN_OPERATOR_ROLE =
        keccak256("PL_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause plUSD
     */
    bytes32 public constant PL_USD_PAUSE_OPERATOR_ROLE =
        keccak256("PL_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Plasma USD", "plUSD");
    }

    /**
     * @dev AC role, owner of which can mint plUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return PL_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn plUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return PL_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause plUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return PL_USD_PAUSE_OPERATOR_ROLE;
    }
}
