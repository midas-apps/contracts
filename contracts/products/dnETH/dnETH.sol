// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title dnETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract dnETH is mToken {
    /**
     * @notice actor that can mint dnETH
     */
    bytes32 public constant DN_ETH_MINT_OPERATOR_ROLE =
        keccak256("DN_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn dnETH
     */
    bytes32 public constant DN_ETH_BURN_OPERATOR_ROLE =
        keccak256("DN_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause dnETH
     */
    bytes32 public constant DN_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("DN_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Delta Neutral ETH", "dnETH");
    }

    /**
     * @dev AC role, owner of which can mint dnETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return DN_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn dnETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return DN_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause dnETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return DN_ETH_PAUSE_OPERATOR_ROLE;
    }
}
