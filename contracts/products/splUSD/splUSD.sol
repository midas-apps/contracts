// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title splUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract splUSD is mToken {
    /**
     * @notice actor that can mint splUSD
     */
    bytes32 public constant SPL_USD_MINT_OPERATOR_ROLE =
        keccak256("SPL_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn splUSD
     */
    bytes32 public constant SPL_USD_BURN_OPERATOR_ROLE =
        keccak256("SPL_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause splUSD
     */
    bytes32 public constant SPL_USD_PAUSE_OPERATOR_ROLE =
        keccak256("SPL_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Staked Plasma USD", "splUSD");
    }

    /**
     * @dev AC role, owner of which can mint splUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return SPL_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn splUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return SPL_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause splUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return SPL_USD_PAUSE_OPERATOR_ROLE;
    }
}
