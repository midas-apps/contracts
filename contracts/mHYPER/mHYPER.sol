// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mToken.sol";

/**
 * @title mHYPER
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mHYPER is mToken {
    /**
     * @notice actor that can mint mHYPER
     */
    bytes32 public constant M_HYPER_MINT_OPERATOR_ROLE =
        keccak256("M_HYPER_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mHYPER
     */
    bytes32 public constant M_HYPER_BURN_OPERATOR_ROLE =
        keccak256("M_HYPER_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mHYPER
     */
    bytes32 public constant M_HYPER_PAUSE_OPERATOR_ROLE =
        keccak256("M_HYPER_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm", "mHYPER");
    }

    /**
     * @dev AC role, owner of which can mint mHYPER token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_HYPER_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mHYPER token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_HYPER_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mHYPER token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_HYPER_PAUSE_OPERATOR_ROLE;
    }
}
