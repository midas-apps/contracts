// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title kmiUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract kmiUSD is mToken {
    /**
     * @notice actor that can mint kmiUSD
     */
    bytes32 public constant KMI_USD_MINT_OPERATOR_ROLE =
        keccak256("KMI_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn kmiUSD
     */
    bytes32 public constant KMI_USD_BURN_OPERATOR_ROLE =
        keccak256("KMI_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause kmiUSD
     */
    bytes32 public constant KMI_USD_PAUSE_OPERATOR_ROLE =
        keccak256("KMI_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Katana miUSD", "kmiUSD");
    }

    /**
     * @dev AC role, owner of which can mint kmiUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return KMI_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn kmiUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return KMI_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause kmiUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return KMI_USD_PAUSE_OPERATOR_ROLE;
    }
}
