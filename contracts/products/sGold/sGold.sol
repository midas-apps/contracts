// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title sGold
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract sGold is mToken {
    /**
     * @notice actor that can mint sGold
     */
    bytes32 public constant S_GOLD_MINT_OPERATOR_ROLE =
        keccak256("S_GOLD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn sGold
     */
    bytes32 public constant S_GOLD_BURN_OPERATOR_ROLE =
        keccak256("S_GOLD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause sGold
     */
    bytes32 public constant S_GOLD_PAUSE_OPERATOR_ROLE =
        keccak256("S_GOLD_PAUSE_OPERATOR_ROLE");

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
        return ("Suissequant Gold Yield", "sGold");
    }

    /**
     * @dev AC role, owner of which can mint sGold token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return S_GOLD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn sGold token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return S_GOLD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause sGold token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return S_GOLD_PAUSE_OPERATOR_ROLE;
    }
}
