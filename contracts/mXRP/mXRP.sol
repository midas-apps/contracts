// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mToken.sol";

/**
 * @title mXRP
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mXRP is mToken {
    /**
     * @notice actor that can mint mXRP
     */
    bytes32 public constant M_XRP_MINT_OPERATOR_ROLE =
        keccak256("M_XRP_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mXRP
     */
    bytes32 public constant M_XRP_BURN_OPERATOR_ROLE =
        keccak256("M_XRP_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mXRP
     */
    bytes32 public constant M_XRP_PAUSE_OPERATOR_ROLE =
        keccak256("M_XRP_PAUSE_OPERATOR_ROLE");

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
        return ("Midas XRP", "mXRP");
    }

    /**
     * @dev AC role, owner of which can mint mXRP token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_XRP_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mXRP token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_XRP_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mXRP token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_XRP_PAUSE_OPERATOR_ROLE;
    }
}
