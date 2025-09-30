// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title wNLP
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract wNLP is mToken {
    /**
     * @notice actor that can mint wNLP
     */
    bytes32 public constant W_NLP_MINT_OPERATOR_ROLE =
        keccak256("W_NLP_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn wNLP
     */
    bytes32 public constant W_NLP_BURN_OPERATOR_ROLE =
        keccak256("W_NLP_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause wNLP
     */
    bytes32 public constant W_NLP_PAUSE_OPERATOR_ROLE =
        keccak256("W_NLP_PAUSE_OPERATOR_ROLE");

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
        return ("Nunch wNLP", "wNLP");
    }

    /**
     * @dev AC role, owner of which can mint wNLP token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return W_NLP_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn wNLP token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return W_NLP_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause wNLP token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return W_NLP_PAUSE_OPERATOR_ROLE;
    }
}
