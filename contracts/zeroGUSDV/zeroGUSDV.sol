// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mToken.sol";

/**
 * @title zeroGUSDV
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract zeroGUSDV is mToken {
    /**
     * @notice actor that can mint zeroGUSDV
     */
    bytes32 public constant ZEROG_USDV_MINT_OPERATOR_ROLE =
        keccak256("ZEROG_USDV_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn zeroGUSDV
     */
    bytes32 public constant ZEROG_USDV_BURN_OPERATOR_ROLE =
        keccak256("ZEROG_USDV_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause zeroGUSDV
     */
    bytes32 public constant ZEROG_USDV_PAUSE_OPERATOR_ROLE =
        keccak256("ZEROG_USDV_PAUSE_OPERATOR_ROLE");

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
        return ("0G USD Vault", "0gUSDV");
    }

    /**
     * @dev AC role, owner of which can mint zeroGUSDV token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return ZEROG_USDV_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn zeroGUSDV token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return ZEROG_USDV_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause zeroGUSDV token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return ZEROG_USDV_PAUSE_OPERATOR_ROLE;
    }
}
