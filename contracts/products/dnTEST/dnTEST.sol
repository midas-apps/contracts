// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title dnTEST
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract dnTEST is mToken {
    /**
     * @notice actor that can mint dnTEST
     */
    bytes32 public constant DN_TEST_MINT_OPERATOR_ROLE =
        keccak256("DN_TEST_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn dnTEST
     */
    bytes32 public constant DN_TEST_BURN_OPERATOR_ROLE =
        keccak256("DN_TEST_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause dnTEST
     */
    bytes32 public constant DN_TEST_PAUSE_OPERATOR_ROLE =
        keccak256("DN_TEST_PAUSE_OPERATOR_ROLE");

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
        return ("Delta Neutral TEST", "dnTEST");
    }

    /**
     * @dev AC role, owner of which can mint dnTEST token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return DN_TEST_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn dnTEST token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return DN_TEST_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause dnTEST token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return DN_TEST_PAUSE_OPERATOR_ROLE;
    }
}
