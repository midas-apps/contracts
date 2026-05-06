// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title dnPUMP
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract dnPUMP is mToken {
    /**
     * @notice actor that can mint dnPUMP
     */
    bytes32 public constant DN_PUMP_MINT_OPERATOR_ROLE =
        keccak256("DN_PUMP_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn dnPUMP
     */
    bytes32 public constant DN_PUMP_BURN_OPERATOR_ROLE =
        keccak256("DN_PUMP_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause dnPUMP
     */
    bytes32 public constant DN_PUMP_PAUSE_OPERATOR_ROLE =
        keccak256("DN_PUMP_PAUSE_OPERATOR_ROLE");

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
        return ("Delta Neutral PUMP", "dnPUMP");
    }

    /**
     * @dev AC role, owner of which can mint dnPUMP token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return DN_PUMP_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn dnPUMP token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return DN_PUMP_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause dnPUMP token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return DN_PUMP_PAUSE_OPERATOR_ROLE;
    }
}
