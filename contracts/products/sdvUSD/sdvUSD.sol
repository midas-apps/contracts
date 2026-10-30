// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title sdvUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract sdvUSD is mToken {
    /**
     * @notice actor that can mint sdvUSD
     */
    bytes32 public constant SDV_USD_MINT_OPERATOR_ROLE =
        keccak256("SDV_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn sdvUSD
     */
    bytes32 public constant SDV_USD_BURN_OPERATOR_ROLE =
        keccak256("SDV_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause sdvUSD
     */
    bytes32 public constant SDV_USD_PAUSE_OPERATOR_ROLE =
        keccak256("SDV_USD_PAUSE_OPERATOR_ROLE");

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
        return ("Staked Drivvy USD Vault", "sdvUSD");
    }

    /**
     * @dev AC role, owner of which can mint sdvUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return SDV_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn sdvUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return SDV_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause sdvUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return SDV_USD_PAUSE_OPERATOR_ROLE;
    }
}
