// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title zeroGBTCV
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract zeroGBTCV is mToken {
    /**
     * @notice actor that can mint zeroGBTCV
     */
    bytes32 public constant ZEROG_BTCV_MINT_OPERATOR_ROLE =
        keccak256("ZEROG_BTCV_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn zeroGBTCV
     */
    bytes32 public constant ZEROG_BTCV_BURN_OPERATOR_ROLE =
        keccak256("ZEROG_BTCV_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause zeroGBTCV
     */
    bytes32 public constant ZEROG_BTCV_PAUSE_OPERATOR_ROLE =
        keccak256("ZEROG_BTCV_PAUSE_OPERATOR_ROLE");

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
        return ("0G BTC Vault", "0gBTCV");
    }

    /**
     * @dev AC role, owner of which can mint zeroGBTCV token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return ZEROG_BTCV_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn zeroGBTCV token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return ZEROG_BTCV_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause zeroGBTCV token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return ZEROG_BTCV_PAUSE_OPERATOR_ROLE;
    }
}
