// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mALPHA
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mALPHA is mToken {
    /**
     * @notice actor that can mint mALPHA
     */
    bytes32 public constant M_ALPHA_MINT_OPERATOR_ROLE =
        keccak256("M_ALPHA_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mALPHA
     */
    bytes32 public constant M_ALPHA_BURN_OPERATOR_ROLE =
        keccak256("M_ALPHA_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mALPHA
     */
    bytes32 public constant M_ALPHA_PAUSE_OPERATOR_ROLE =
        keccak256("M_ALPHA_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm Alpha", "mALPHA");
    }

    /**
     * @dev AC role, owner of which can mint mALPHA token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_ALPHA_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mALPHA token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_ALPHA_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mALPHA token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_ALPHA_PAUSE_OPERATOR_ROLE;
    }
}
