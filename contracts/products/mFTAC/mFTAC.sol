// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mFTAC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mFTAC is mToken {
    /**
     * @notice actor that can mint mFTAC
     */
    bytes32 public constant M_FTAC_MINT_OPERATOR_ROLE =
        keccak256("M_FTAC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mFTAC
     */
    bytes32 public constant M_FTAC_BURN_OPERATOR_ROLE =
        keccak256("M_FTAC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mFTAC
     */
    bytes32 public constant M_FTAC_PAUSE_OPERATOR_ROLE =
        keccak256("M_FTAC_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Fasanara TAC", "mFTAC");
    }

    /**
     * @dev AC role, owner of which can mint mFTAC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_FTAC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mFTAC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_FTAC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mFTAC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_FTAC_PAUSE_OPERATOR_ROLE;
    }
}
