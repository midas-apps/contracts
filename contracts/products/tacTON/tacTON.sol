// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title tacTON
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract tacTON is mToken {
    /**
     * @notice actor that can mint tacTON
     */
    bytes32 public constant TAC_TON_MINT_OPERATOR_ROLE =
        keccak256("TAC_TON_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn tacTON
     */
    bytes32 public constant TAC_TON_BURN_OPERATOR_ROLE =
        keccak256("TAC_TON_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause tacTON
     */
    bytes32 public constant TAC_TON_PAUSE_OPERATOR_ROLE =
        keccak256("TAC_TON_PAUSE_OPERATOR_ROLE");

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
        return ("tacTON", "tacTON");
    }

    /**
     * @dev AC role, owner of which can mint tacTON token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return TAC_TON_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn tacTON token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return TAC_TON_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause tacTON token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return TAC_TON_PAUSE_OPERATOR_ROLE;
    }
}
