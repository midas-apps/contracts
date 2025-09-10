// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mToken.sol";

/**
 * @title msyrupUSDT
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract msyrupUSDT is mToken {
    /**
     * @notice actor that can mint msyrupUSDT
     */
    bytes32 public constant M_SYRUP_USDT_MINT_OPERATOR_ROLE =
        keccak256("M_SYRUP_USDT_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn msyrupUSDT
     */
    bytes32 public constant M_SYRUP_USDT_BURN_OPERATOR_ROLE =
        keccak256("M_SYRUP_USDT_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause msyrupUSDT
     */
    bytes32 public constant M_SYRUP_USDT_PAUSE_OPERATOR_ROLE =
        keccak256("M_SYRUP_USDT_PAUSE_OPERATOR_ROLE");

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
        return ("Plasma syrupUSDT Pre-deposit Vault", "msyrupUSDT");
    }

    /**
     * @dev AC role, owner of which can mint msyrupUSDT token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_SYRUP_USDT_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn msyrupUSDT token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_SYRUP_USDT_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause msyrupUSDT token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_SYRUP_USDT_PAUSE_OPERATOR_ROLE;
    }
}
