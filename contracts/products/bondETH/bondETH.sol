// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title bondETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract bondETH is mToken {
    /**
     * @notice actor that can mint bondETH
     */
    bytes32 public constant BOND_ETH_MINT_OPERATOR_ROLE =
        keccak256("BOND_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn bondETH
     */
    bytes32 public constant BOND_ETH_BURN_OPERATOR_ROLE =
        keccak256("BOND_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause bondETH
     */
    bytes32 public constant BOND_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("BOND_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Bond ETH", "bondETH");
    }

    /**
     * @dev AC role, owner of which can mint bondETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return BOND_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn bondETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return BOND_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause bondETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return BOND_ETH_PAUSE_OPERATOR_ROLE;
    }
}
