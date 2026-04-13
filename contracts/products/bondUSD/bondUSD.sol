// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title bondUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract bondUSD is mToken {
    /**
     * @notice actor that can mint bondUSD
     */
    bytes32 public constant BOND_USD_MINT_OPERATOR_ROLE =
        keccak256("BOND_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn bondUSD
     */
    bytes32 public constant BOND_USD_BURN_OPERATOR_ROLE =
        keccak256("BOND_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause bondUSD
     */
    bytes32 public constant BOND_USD_PAUSE_OPERATOR_ROLE =
        keccak256("BOND_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Bond USD", "bondUSD");
    }

    /**
     * @dev AC role, owner of which can mint bondUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return BOND_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn bondUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return BOND_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause bondUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return BOND_USD_PAUSE_OPERATOR_ROLE;
    }
}
