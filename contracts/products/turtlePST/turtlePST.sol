// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title turtlePST
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract turtlePST is mToken {
    /**
     * @notice actor that can mint turtlePST
     */
    bytes32 public constant TURTLE_PST_MINT_OPERATOR_ROLE =
        keccak256("TURTLE_PST_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn turtlePST
     */
    bytes32 public constant TURTLE_PST_BURN_OPERATOR_ROLE =
        keccak256("TURTLE_PST_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause turtlePST
     */
    bytes32 public constant TURTLE_PST_PAUSE_OPERATOR_ROLE =
        keccak256("TURTLE_PST_PAUSE_OPERATOR_ROLE");

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
        return ("Turtle Huma PST Vault", "turtlePST");
    }

    /**
     * @dev AC role, owner of which can mint turtlePST token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return TURTLE_PST_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn turtlePST token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return TURTLE_PST_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause turtlePST token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return TURTLE_PST_PAUSE_OPERATOR_ROLE;
    }
}
