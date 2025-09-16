// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mFARM
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mFARM is mToken {
    /**
     * @notice actor that can mint mFARM
     */
    bytes32 public constant M_FARM_MINT_OPERATOR_ROLE =
        keccak256("M_FARM_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mFARM
     */
    bytes32 public constant M_FARM_BURN_OPERATOR_ROLE =
        keccak256("M_FARM_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mFARM
     */
    bytes32 public constant M_FARM_PAUSE_OPERATOR_ROLE =
        keccak256("M_FARM_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Farm Capital", "mFARM");
    }

    /**
     * @dev AC role, owner of which can mint mFARM token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_FARM_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mFARM token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_FARM_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mFARM token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_FARM_PAUSE_OPERATOR_ROLE;
    }
}
