// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mGLO
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mGLO is mToken {
    /**
     * @notice actor that can mint mGLO
     */
    bytes32 public constant M_GLO_MINT_OPERATOR_ROLE =
        keccak256("M_GLO_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mGLO
     */
    bytes32 public constant M_GLO_BURN_OPERATOR_ROLE =
        keccak256("M_GLO_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mGLO
     */
    bytes32 public constant M_GLO_PAUSE_OPERATOR_ROLE =
        keccak256("M_GLO_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Fasanara Global Open", "mGLO");
    }

    /**
     * @dev AC role, owner of which can mint mGLO token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_GLO_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mGLO token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_GLO_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mGLO token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_GLO_PAUSE_OPERATOR_ROLE;
    }
}
