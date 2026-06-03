// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title liquidRWA
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract liquidRWA is mToken {
    /**
     * @notice actor that can mint liquidRWA
     */
    bytes32 public constant LIQUID_RWA_MINT_OPERATOR_ROLE =
        keccak256("LIQUID_RWA_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn liquidRWA
     */
    bytes32 public constant LIQUID_RWA_BURN_OPERATOR_ROLE =
        keccak256("LIQUID_RWA_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause liquidRWA
     */
    bytes32 public constant LIQUID_RWA_PAUSE_OPERATOR_ROLE =
        keccak256("LIQUID_RWA_PAUSE_OPERATOR_ROLE");

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
        return ("Ether.fi Liquid RWA", "liquidRWA");
    }

    /**
     * @dev AC role, owner of which can mint liquidRWA token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return LIQUID_RWA_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn liquidRWA token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return LIQUID_RWA_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause liquidRWA token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return LIQUID_RWA_PAUSE_OPERATOR_ROLE;
    }
}
