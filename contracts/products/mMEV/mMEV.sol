// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../../mToken.sol";

/**
 * @title mMEV
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mMEV is mToken {
    /**
     * @notice actor that can mint mMEV
     */
    bytes32 public constant M_MEV_MINT_OPERATOR_ROLE =
        keccak256("M_MEV_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mMEV
     */
    bytes32 public constant M_MEV_BURN_OPERATOR_ROLE =
        keccak256("M_MEV_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mMEV
     */
    bytes32 public constant M_MEV_PAUSE_OPERATOR_ROLE =
        keccak256("M_MEV_PAUSE_OPERATOR_ROLE");

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
        return ("Midas MEV", "mMEV");
    }

    /**
     * @dev AC role, owner of which can mint mMEV token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_MEV_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mMEV token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_MEV_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mMEV token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_MEV_PAUSE_OPERATOR_ROLE;
    }
}
