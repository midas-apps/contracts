// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title sLINJ
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract sLINJ is mToken {
    /**
     * @notice actor that can mint sLINJ
     */
    bytes32 public constant SL_INJ_MINT_OPERATOR_ROLE =
        keccak256("SL_INJ_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn sLINJ
     */
    bytes32 public constant SL_INJ_BURN_OPERATOR_ROLE =
        keccak256("SL_INJ_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause sLINJ
     */
    bytes32 public constant SL_INJ_PAUSE_OPERATOR_ROLE =
        keccak256("SL_INJ_PAUSE_OPERATOR_ROLE");

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
        return ("INJ Loop Stake Vault", "sLINJ");
    }

    /**
     * @dev AC role, owner of which can mint sLINJ token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return SL_INJ_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn sLINJ token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return SL_INJ_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause sLINJ token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return SL_INJ_PAUSE_OPERATOR_ROLE;
    }
}
