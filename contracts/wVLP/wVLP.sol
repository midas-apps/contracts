// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mToken.sol";

/**
 * @title wVLP
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract wVLP is mToken {
    /**
     * @notice actor that can mint wVLP
     */
    bytes32 public constant W_VLP_MINT_OPERATOR_ROLE =
        keccak256("W_VLP_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn wVLP
     */
    bytes32 public constant W_VLP_BURN_OPERATOR_ROLE =
        keccak256("W_VLP_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause wVLP
     */
    bytes32 public constant W_VLP_PAUSE_OPERATOR_ROLE =
        keccak256("W_VLP_PAUSE_OPERATOR_ROLE");

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
        return ("Hyperbeat VLP", "wVLP");
    }

    /**
     * @dev AC role, owner of which can mint wVLP token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return W_VLP_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn wVLP token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return W_VLP_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause wVLP token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return W_VLP_PAUSE_OPERATOR_ROLE;
    }
}
