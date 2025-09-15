// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title JIV
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract JIV is mToken {
    /**
     * @notice actor that can mint JIV
     */
    bytes32 public constant JIV_MINT_OPERATOR_ROLE =
        keccak256("JIV_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn JIV
     */
    bytes32 public constant JIV_BURN_OPERATOR_ROLE =
        keccak256("JIV_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause JIV
     */
    bytes32 public constant JIV_PAUSE_OPERATOR_ROLE =
        keccak256("JIV_PAUSE_OPERATOR_ROLE");

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
        return ("Jaine Insurance Vault", "JIV");
    }

    /**
     * @dev AC role, owner of which can mint JIV token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return JIV_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn JIV token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return JIV_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause JIV token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return JIV_PAUSE_OPERATOR_ROLE;
    }
}
