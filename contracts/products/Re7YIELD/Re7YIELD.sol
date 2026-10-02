// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title Re7YIELD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract Re7YIELD is mToken {
    /**
     * @notice actor that can mint Re7YIELD
     */
    bytes32 public constant RE7_YIELD_MINT_OPERATOR_ROLE =
        keccak256("RE7_YIELD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn Re7YIELD
     */
    bytes32 public constant RE7_YIELD_BURN_OPERATOR_ROLE =
        keccak256("RE7_YIELD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause Re7YIELD
     */
    bytes32 public constant RE7_YIELD_PAUSE_OPERATOR_ROLE =
        keccak256("RE7_YIELD_PAUSE_OPERATOR_ROLE");

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
        return ("Re7 Stablecoin Yield Vault", "Re7YIELD");
    }

    /**
     * @dev AC role, owner of which can mint Re7YIELD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return RE7_YIELD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn Re7YIELD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return RE7_YIELD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause Re7YIELD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return RE7_YIELD_PAUSE_OPERATOR_ROLE;
    }
}
