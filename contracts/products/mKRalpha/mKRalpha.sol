// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mKRalpha
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mKRalpha is mToken {
    /**
     * @notice actor that can mint mKRalpha
     */
    bytes32 public constant M_KRALPHA_MINT_OPERATOR_ROLE =
        keccak256("M_KRALPHA_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mKRalpha
     */
    bytes32 public constant M_KRALPHA_BURN_OPERATOR_ROLE =
        keccak256("M_KRALPHA_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mKRalpha
     */
    bytes32 public constant M_KRALPHA_PAUSE_OPERATOR_ROLE =
        keccak256("M_KRALPHA_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Keyrock Alpha", "mKRalpha");
    }

    /**
     * @dev AC role, owner of which can mint mKRalpha token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_KRALPHA_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mKRalpha token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_KRALPHA_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mKRalpha token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_KRALPHA_PAUSE_OPERATOR_ROLE;
    }
}
