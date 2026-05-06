// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title liquidRESERVE
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract liquidRESERVE is mToken {
    /**
     * @notice actor that can mint liquidRESERVE
     */
    bytes32 public constant LIQUID_RESERVE_MINT_OPERATOR_ROLE =
        keccak256("LIQUID_RESERVE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn liquidRESERVE
     */
    bytes32 public constant LIQUID_RESERVE_BURN_OPERATOR_ROLE =
        keccak256("LIQUID_RESERVE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause liquidRESERVE
     */
    bytes32 public constant LIQUID_RESERVE_PAUSE_OPERATOR_ROLE =
        keccak256("LIQUID_RESERVE_PAUSE_OPERATOR_ROLE");

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
        return ("Ether.Fi Liquid Reserve", "liquidRESERVE");
    }

    /**
     * @dev AC role, owner of which can mint liquidRESERVE token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return LIQUID_RESERVE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn liquidRESERVE token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return LIQUID_RESERVE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause liquidRESERVE token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return LIQUID_RESERVE_PAUSE_OPERATOR_ROLE;
    }
}
