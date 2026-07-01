// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mRe7ETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mRe7ETH is mToken {
    /**
     * @notice actor that can mint mRe7ETH
     */
    bytes32 public constant M_RE7ETH_MINT_OPERATOR_ROLE =
        keccak256("M_RE7ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mRe7ETH
     */
    bytes32 public constant M_RE7ETH_BURN_OPERATOR_ROLE =
        keccak256("M_RE7ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mRe7ETH
     */
    bytes32 public constant M_RE7ETH_PAUSE_OPERATOR_ROLE =
        keccak256("M_RE7ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Re7 Ethereum", "mRe7ETH");
    }

    /**
     * @dev AC role, owner of which can mint mRe7ETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_RE7ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mRe7ETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_RE7ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mRe7ETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_RE7ETH_PAUSE_OPERATOR_ROLE;
    }
}
