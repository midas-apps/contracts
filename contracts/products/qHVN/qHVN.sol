// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mTokenPermissioned.sol";
import "./QHVNMidasAccessControlRoles.sol";

/**
 * @title qHVN
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract qHVN is mTokenPermissioned, QHVNMidasAccessControlRoles {
    /**
     * @notice actor that can mint qHVN
     */
    bytes32 public constant Q_HVN_MINT_OPERATOR_ROLE =
        keccak256("Q_HVN_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn qHVN
     */
    bytes32 public constant Q_HVN_BURN_OPERATOR_ROLE =
        keccak256("Q_HVN_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause qHVN
     */
    bytes32 public constant Q_HVN_PAUSE_OPERATOR_ROLE =
        keccak256("Q_HVN_PAUSE_OPERATOR_ROLE");

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
        return ("Qapture Safe Haven", "qHVN");
    }

    /**
     * @dev AC role, owner of which can mint qHVN token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return Q_HVN_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn qHVN token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return Q_HVN_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause qHVN token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return Q_HVN_PAUSE_OPERATOR_ROLE;
    }

    /**
     * @inheritdoc mTokenPermissioned
     */
    function _greenlistedRole() internal pure override returns (bytes32) {
        return Q_HVN_GREENLISTED_ROLE;
    }
}
