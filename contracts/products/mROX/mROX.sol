// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mROX
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mROX is mToken {
    /**
     * @notice actor that can mint mROX
     */
    bytes32 public constant M_ROX_MINT_OPERATOR_ROLE =
        keccak256("M_ROX_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mROX
     */
    bytes32 public constant M_ROX_BURN_OPERATOR_ROLE =
        keccak256("M_ROX_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mROX
     */
    bytes32 public constant M_ROX_PAUSE_OPERATOR_ROLE =
        keccak256("M_ROX_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Rockaway Market Neutral", "mROX");
    }

    /**
     * @dev AC role, owner of which can mint mROX token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_ROX_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mROX token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_ROX_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mROX token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_ROX_PAUSE_OPERATOR_ROLE;
    }
}
