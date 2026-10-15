// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title radYC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract radYC is mToken {
    /**
     * @notice actor that can mint radYC
     */
    bytes32 public constant RAD_YC_MINT_OPERATOR_ROLE =
        keccak256("RAD_YC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn radYC
     */
    bytes32 public constant RAD_YC_BURN_OPERATOR_ROLE =
        keccak256("RAD_YC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause radYC
     */
    bytes32 public constant RAD_YC_PAUSE_OPERATOR_ROLE =
        keccak256("RAD_YC_PAUSE_OPERATOR_ROLE");

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
        return ("Radial radYC", "radYC");
    }

    /**
     * @dev AC role, owner of which can mint radYC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return RAD_YC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn radYC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return RAD_YC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause radYC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return RAD_YC_PAUSE_OPERATOR_ROLE;
    }
}
