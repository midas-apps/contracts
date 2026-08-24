// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mArb
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mArb is mToken {
    /**
     * @notice actor that can mint mArb
     */
    bytes32 public constant M_ARB_MINT_OPERATOR_ROLE =
        keccak256("M_ARB_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mArb
     */
    bytes32 public constant M_ARB_BURN_OPERATOR_ROLE =
        keccak256("M_ARB_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mArb
     */
    bytes32 public constant M_ARB_PAUSE_OPERATOR_ROLE =
        keccak256("M_ARB_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm Arbitrage", "mArb");
    }

    /**
     * @dev AC role, owner of which can mint mArb token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_ARB_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mArb token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_ARB_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mArb token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_ARB_PAUSE_OPERATOR_ROLE;
    }
}
