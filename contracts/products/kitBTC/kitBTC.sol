// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title kitBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract kitBTC is mToken {
    /**
     * @notice actor that can mint kitBTC
     */
    bytes32 public constant KIT_BTC_MINT_OPERATOR_ROLE =
        keccak256("KIT_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn kitBTC
     */
    bytes32 public constant KIT_BTC_BURN_OPERATOR_ROLE =
        keccak256("KIT_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause kitBTC
     */
    bytes32 public constant KIT_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("KIT_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("Kitchen Pre-deposit $kitBTC", "$kitBTC");
    }

    /**
     * @dev AC role, owner of which can mint kitBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return KIT_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn kitBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return KIT_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause kitBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return KIT_BTC_PAUSE_OPERATOR_ROLE;
    }
}
