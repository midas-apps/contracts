// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../../mToken.sol";

/**
 * @title mEDGE
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mEDGE is mToken {
    /**
     * @notice actor that can mint mEDGE
     */
    bytes32 public constant M_EDGE_MINT_OPERATOR_ROLE =
        keccak256("M_EDGE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mEDGE
     */
    bytes32 public constant M_EDGE_BURN_OPERATOR_ROLE =
        keccak256("M_EDGE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mEDGE
     */
    bytes32 public constant M_EDGE_PAUSE_OPERATOR_ROLE =
        keccak256("M_EDGE_PAUSE_OPERATOR_ROLE");

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
        return ("Midas mEDGE", "mEDGE");
    }

    /**
     * @dev AC role, owner of which can mint mEDGE token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_EDGE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mEDGE token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_EDGE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mEDGE token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_EDGE_PAUSE_OPERATOR_ROLE;
    }
}
