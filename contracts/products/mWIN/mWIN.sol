// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mWIN
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mWIN is mToken {
    /**
     * @notice actor that can mint mWIN
     */
    bytes32 public constant M_WIN_MINT_OPERATOR_ROLE =
        keccak256("M_WIN_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mWIN
     */
    bytes32 public constant M_WIN_BURN_OPERATOR_ROLE =
        keccak256("M_WIN_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mWIN
     */
    bytes32 public constant M_WIN_PAUSE_OPERATOR_ROLE =
        keccak256("M_WIN_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Wellington Income Opportunities", "mWIN");
    }

    /**
     * @dev AC role, owner of which can mint mWIN token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_WIN_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mWIN token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_WIN_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mWIN token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_WIN_PAUSE_OPERATOR_ROLE;
    }
}
