// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mTBILL
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mTBILL is mToken {
    /**
     * @notice actor that can mint mTBILL
     */
    bytes32 public constant M_TBILL_MINT_OPERATOR_ROLE =
        keccak256("M_TBILL_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mTBILL
     */
    bytes32 public constant M_TBILL_BURN_OPERATOR_ROLE =
        keccak256("M_TBILL_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mTBILL
     */
    bytes32 public constant M_TBILL_PAUSE_OPERATOR_ROLE =
        keccak256("M_TBILL_PAUSE_OPERATOR_ROLE");

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
        return ("Midas US Treasury Bill Token", "mTBILL");
    }

    /**
     * @dev AC role, owner of which can mint mTBILL token
     */
    function _minterRole() internal pure virtual override returns (bytes32) {
        return M_TBILL_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mTBILL token
     */
    function _burnerRole() internal pure virtual override returns (bytes32) {
        return M_TBILL_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mTBILL token
     */
    function _pauserRole() internal pure virtual override returns (bytes32) {
        return M_TBILL_PAUSE_OPERATOR_ROLE;
    }
}
