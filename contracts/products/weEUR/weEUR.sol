// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title weEUR
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract weEUR is mToken {
    /**
     * @notice actor that can mint weEUR
     */
    bytes32 public constant WE_EUR_MINT_OPERATOR_ROLE =
        keccak256("WE_EUR_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn weEUR
     */
    bytes32 public constant WE_EUR_BURN_OPERATOR_ROLE =
        keccak256("WE_EUR_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause weEUR
     */
    bytes32 public constant WE_EUR_PAUSE_OPERATOR_ROLE =
        keccak256("WE_EUR_PAUSE_OPERATOR_ROLE");

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
        return ("Liquid Euro", "weEUR");
    }

    /**
     * @dev AC role, owner of which can mint weEUR token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return WE_EUR_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn weEUR token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return WE_EUR_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause weEUR token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return WE_EUR_PAUSE_OPERATOR_ROLE;
    }
}
