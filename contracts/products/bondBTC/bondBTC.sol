// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title bondBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract bondBTC is mToken {
    /**
     * @notice actor that can mint bondBTC
     */
    bytes32 public constant BOND_BTC_MINT_OPERATOR_ROLE =
        keccak256("BOND_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn bondBTC
     */
    bytes32 public constant BOND_BTC_BURN_OPERATOR_ROLE =
        keccak256("BOND_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause bondBTC
     */
    bytes32 public constant BOND_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("BOND_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("Bond BTC", "bondBTC");
    }

    /**
     * @dev AC role, owner of which can mint bondBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return BOND_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn bondBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return BOND_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause bondBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return BOND_BTC_PAUSE_OPERATOR_ROLE;
    }
}
