// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mToken.sol";

/**
 * @title zeroGETHV
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract zeroGETHV is mToken {
    /**
     * @notice actor that can mint zeroGETHV
     */
    bytes32 public constant ZEROG_ETHV_MINT_OPERATOR_ROLE =
        keccak256("ZEROG_ETHV_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn zeroGETHV
     */
    bytes32 public constant ZEROG_ETHV_BURN_OPERATOR_ROLE =
        keccak256("ZEROG_ETHV_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause zeroGETHV
     */
    bytes32 public constant ZEROG_ETHV_PAUSE_OPERATOR_ROLE =
        keccak256("ZEROG_ETHV_PAUSE_OPERATOR_ROLE");

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
        return ("0G ETH Vault", "0gETHV");
    }

    /**
     * @dev AC role, owner of which can mint zeroGETHV token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return ZEROG_ETHV_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn zeroGETHV token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return ZEROG_ETHV_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause zeroGETHV token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return ZEROG_ETHV_PAUSE_OPERATOR_ROLE;
    }
}
