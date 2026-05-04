// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../mTokenPermissioned.sol";
import "./MGlobalMidasAccessControlRoles.sol";

/**
 * @title mGLOBAL
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mGLOBAL is mTokenPermissioned, MGlobalMidasAccessControlRoles {
    /**
     * @notice actor that can mint mGLOBAL
     */
    bytes32 public constant M_GLOBAL_MINT_OPERATOR_ROLE =
        keccak256("M_GLOBAL_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mGLOBAL
     */
    bytes32 public constant M_GLOBAL_BURN_OPERATOR_ROLE =
        keccak256("M_GLOBAL_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mGLOBAL
     */
    bytes32 public constant M_GLOBAL_PAUSE_OPERATOR_ROLE =
        keccak256("M_GLOBAL_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Fasanara Global", "mGLOBAL");
    }

    /**
     * @dev AC role, owner of which can mint mGLOBAL token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_GLOBAL_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mGLOBAL token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_GLOBAL_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mGLOBAL token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_GLOBAL_PAUSE_OPERATOR_ROLE;
    }

    /**
     * @inheritdoc mTokenPermissioned
     */
    function _greenlistedRole() internal pure override returns (bytes32) {
        return M_GLOBAL_GREENLISTED_ROLE;
    }
}
