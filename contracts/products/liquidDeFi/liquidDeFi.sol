// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title liquidDeFi
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract liquidDeFi is mToken {
    /**
     * @notice actor that can mint liquidDeFi
     */
    bytes32 public constant LIQUID_DEFI_MINT_OPERATOR_ROLE =
        keccak256("LIQUID_DEFI_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn liquidDeFi
     */
    bytes32 public constant LIQUID_DEFI_BURN_OPERATOR_ROLE =
        keccak256("LIQUID_DEFI_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause liquidDeFi
     */
    bytes32 public constant LIQUID_DEFI_PAUSE_OPERATOR_ROLE =
        keccak256("LIQUID_DEFI_PAUSE_OPERATOR_ROLE");

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
        return ("Ether.Fi Liquid DeFi", "liquidDeFi");
    }

    /**
     * @dev AC role, owner of which can mint liquidDeFi token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return LIQUID_DEFI_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn liquidDeFi token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return LIQUID_DEFI_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause liquidDeFi token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return LIQUID_DEFI_PAUSE_OPERATOR_ROLE;
    }
}
