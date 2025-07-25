// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../../mToken.sol";

/**
 * @title TACmEDGE
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract TACmEDGE is mToken {
    /**
     * @notice actor that can mint TACmEDGE
     */
    bytes32 public constant TAC_M_EDGE_MINT_OPERATOR_ROLE =
        keccak256("TAC_M_EDGE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn TACmEDGE
     */
    bytes32 public constant TAC_M_EDGE_BURN_OPERATOR_ROLE =
        keccak256("TAC_M_EDGE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause TACmEDGE
     */
    bytes32 public constant TAC_M_EDGE_PAUSE_OPERATOR_ROLE =
        keccak256("TAC_M_EDGE_PAUSE_OPERATOR_ROLE");

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
        return ("Midas TACmEDGE Token", "TACmEDGE");
    }

    /**
     * @dev AC role, owner of which can mint TACmEDGE token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return TAC_M_EDGE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn TACmEDGE token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return TAC_M_EDGE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause TACmEDGE token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return TAC_M_EDGE_PAUSE_OPERATOR_ROLE;
    }
}
