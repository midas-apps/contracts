// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mTokenMinBalance.sol";

/**
 * @title mGLOeuro
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mGLOeuro is mTokenMinBalance {
    /**
     * @notice actor that can mint mGLOeuro
     */
    bytes32 public constant M_GLO_EURO_MINT_OPERATOR_ROLE =
        keccak256("M_GLO_EURO_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mGLOeuro
     */
    bytes32 public constant M_GLO_EURO_BURN_OPERATOR_ROLE =
        keccak256("M_GLO_EURO_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mGLOeuro
     */
    bytes32 public constant M_GLO_EURO_PAUSE_OPERATOR_ROLE =
        keccak256("M_GLO_EURO_PAUSE_OPERATOR_ROLE");

    /**
     * @notice actor that is exempt from mGLOeuro min balance checks
     */
    bytes32 public constant M_GLO_EURO_MIN_BALANCE_EXEMPT_ROLE =
        keccak256("M_GLO_EURO_MIN_BALANCE_EXEMPT_ROLE");

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
        return ("Midas Fasanara Global Euro", "mGLOeuro");
    }

    /**
     * @dev AC role, owner of which can mint mGLOeuro token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_GLO_EURO_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mGLOeuro token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_GLO_EURO_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mGLOeuro token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_GLO_EURO_PAUSE_OPERATOR_ROLE;
    }

    /**
     * @inheritdoc mTokenMinBalance
     */
    function _minBalanceExemptRole() internal pure override returns (bytes32) {
        return M_GLO_EURO_MIN_BALANCE_EXEMPT_ROLE;
    }
}
