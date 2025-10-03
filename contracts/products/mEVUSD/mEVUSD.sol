// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mEVUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mEVUSD is mToken {
    /**
     * @notice actor that can mint mEVUSD
     */
    bytes32 public constant M_EV_USD_MINT_OPERATOR_ROLE =
        keccak256("M_EV_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mEVUSD
     */
    bytes32 public constant M_EV_USD_BURN_OPERATOR_ROLE =
        keccak256("M_EV_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mEVUSD
     */
    bytes32 public constant M_EV_USD_PAUSE_OPERATOR_ROLE =
        keccak256("M_EV_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Everstake USD", "mEVUSD");
    }

    /**
     * @dev AC role, owner of which can mint mEVUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_EV_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mEVUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_EV_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mEVUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_EV_USD_PAUSE_OPERATOR_ROLE;
    }
}
