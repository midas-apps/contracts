// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mToken.sol";

/**
 * @title acreBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract acreBTC is mToken {
    /**
     * @notice actor that can mint acreBTC
     */
    bytes32 public constant ACRE_BTC_MINT_OPERATOR_ROLE =
        keccak256("ACRE_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn acreBTC
     */
    bytes32 public constant ACRE_BTC_BURN_OPERATOR_ROLE =
        keccak256("ACRE_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause acreBTC
     */
    bytes32 public constant ACRE_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("ACRE_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("acreBTC", "acreBTC");
    }

    /**
     * @dev AC role, owner of which can mint acreBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return ACRE_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn acreBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return ACRE_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause acreBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return ACRE_BTC_PAUSE_OPERATOR_ROLE;
    }
}
