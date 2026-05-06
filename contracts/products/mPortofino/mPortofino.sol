// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mPortofino
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mPortofino is mToken {
    /**
     * @notice actor that can mint mPortofino
     */
    bytes32 public constant M_PORTOFINO_MINT_OPERATOR_ROLE =
        keccak256("M_PORTOFINO_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mPortofino
     */
    bytes32 public constant M_PORTOFINO_BURN_OPERATOR_ROLE =
        keccak256("M_PORTOFINO_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mPortofino
     */
    bytes32 public constant M_PORTOFINO_PAUSE_OPERATOR_ROLE =
        keccak256("M_PORTOFINO_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Portofino", "mPortofino");
    }

    /**
     * @dev AC role, owner of which can mint mPortofino token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_PORTOFINO_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mPortofino token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_PORTOFINO_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mPortofino token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_PORTOFINO_PAUSE_OPERATOR_ROLE;
    }
}
