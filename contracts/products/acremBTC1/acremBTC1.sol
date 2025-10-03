// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title acremBTC1
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract acremBTC1 is mToken {
    /**
     * @notice actor that can mint acremBTC1
     */
    bytes32 public constant ACRE_BTC_MINT_OPERATOR_ROLE =
        keccak256("ACRE_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn acremBTC1
     */
    bytes32 public constant ACRE_BTC_BURN_OPERATOR_ROLE =
        keccak256("ACRE_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause acremBTC1
     */
    bytes32 public constant ACRE_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("ACRE_BTC_PAUSE_OPERATOR_ROLE");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @inheritdoc ERC20Upgradeable
     * @dev override to return a new name (not the initial one)
     */
    function name() public pure override returns (string memory _name) {
        (_name, ) = _getNameSymbol();
    }

    /**
     * @inheritdoc ERC20Upgradeable
     * @dev override to return a new symbol (not the initial one)
     */
    function symbol() public pure override returns (string memory _symbol) {
        (, _symbol) = _getNameSymbol();
    }

    /**
     * @inheritdoc mToken
     */
    function _getNameSymbol()
        internal
        pure
        override
        returns (string memory, string memory)
    {
        return ("acremBTC1", "acremBTC1");
    }

    /**
     * @dev AC role, owner of which can mint acremBTC1 token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return ACRE_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn acremBTC1 token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return ACRE_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause acremBTC1 token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return ACRE_BTC_PAUSE_OPERATOR_ROLE;
    }
}
