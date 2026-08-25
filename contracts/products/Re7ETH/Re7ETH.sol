// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title Re7ETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract Re7ETH is mToken {
    /**
     * @notice actor that can mint Re7ETH
     */
    bytes32 public constant RE7_ETH_MINT_OPERATOR_ROLE =
        keccak256("RE7_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn Re7ETH
     */
    bytes32 public constant RE7_ETH_BURN_OPERATOR_ROLE =
        keccak256("RE7_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause Re7ETH
     */
    bytes32 public constant RE7_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("RE7_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Re7 Ethereum Vault", "Re7ETH");
    }

    /**
     * @dev AC role, owner of which can mint Re7ETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return RE7_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn Re7ETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return RE7_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause Re7ETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return RE7_ETH_PAUSE_OPERATOR_ROLE;
    }
}
