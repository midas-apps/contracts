// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title hbUSDC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract hbUSDC is mToken {
    /**
     * @notice actor that can mint hbUSDC
     */
    bytes32 public constant HB_USDC_MINT_OPERATOR_ROLE =
        keccak256("HB_USDC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn hbUSDC
     */
    bytes32 public constant HB_USDC_BURN_OPERATOR_ROLE =
        keccak256("HB_USDC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause hbUSDC
     */
    bytes32 public constant HB_USDC_PAUSE_OPERATOR_ROLE =
        keccak256("HB_USDC_PAUSE_OPERATOR_ROLE");

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
        return ("Hyperbeat USDC", "hbUSDC");
    }

    /**
     * @dev AC role, owner of which can mint hbUSDC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return HB_USDC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn hbUSDC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return HB_USDC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause hbUSDC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return HB_USDC_PAUSE_OPERATOR_ROLE;
    }
}
