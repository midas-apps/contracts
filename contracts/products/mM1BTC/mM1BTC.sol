// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mM1BTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mM1BTC is mToken {
    /**
     * @notice actor that can mint mM1BTC
     */
    bytes32 public constant M_M1_BTC_MINT_OPERATOR_ROLE =
        keccak256("M_M1_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mM1BTC
     */
    bytes32 public constant M_M1_BTC_BURN_OPERATOR_ROLE =
        keccak256("M_M1_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mM1BTC
     */
    bytes32 public constant M_M1_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("M_M1_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("Midas M1 BTC Market Neutral", "mM1-BTC");
    }

    /**
     * @dev AC role, owner of which can mint mM1BTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_M1_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mM1BTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_M1_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mM1BTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_M1_BTC_PAUSE_OPERATOR_ROLE;
    }
}
