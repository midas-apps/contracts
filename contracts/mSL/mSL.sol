// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mToken.sol";

/**
 * @title mSL
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mSL is mToken {
    /**
     * @notice actor that can mint mSL
     */
    bytes32 public constant M_SL_MINT_OPERATOR_ROLE =
        keccak256("M_SL_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mSL
     */
    bytes32 public constant M_SL_BURN_OPERATOR_ROLE =
        keccak256("M_SL_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mSL
     */
    bytes32 public constant M_SL_PAUSE_OPERATOR_ROLE =
        keccak256("M_SL_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Staked Liquidity", "mSL");
    }

    /**
     * @dev AC role, owner of which can mint mSL token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_SL_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mSL token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_SL_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mSL token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_SL_PAUSE_OPERATOR_ROLE;
    }
}
