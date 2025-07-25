// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mToken.sol";

/**
 * @title hbXAUt
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract hbXAUt is mToken {
    /**
     * @notice actor that can mint hbXAUt
     */
    bytes32 public constant HB_XAUT_MINT_OPERATOR_ROLE =
        keccak256("HB_XAUT_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn hbXAUt
     */
    bytes32 public constant HB_XAUT_BURN_OPERATOR_ROLE =
        keccak256("HB_XAUT_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause hbXAUt
     */
    bytes32 public constant HB_XAUT_PAUSE_OPERATOR_ROLE =
        keccak256("HB_XAUT_PAUSE_OPERATOR_ROLE");

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
        return ("Hyperbeat XAUt", "hbXAUt");
    }

    /**
     * @dev AC role, owner of which can mint hbXAUt token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return HB_XAUT_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn hbXAUt token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return HB_XAUT_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause hbXAUt token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return HB_XAUT_PAUSE_OPERATOR_ROLE;
    }
}
