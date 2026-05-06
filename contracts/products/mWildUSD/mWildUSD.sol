// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mWildUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mWildUSD is mToken {
    /**
     * @notice actor that can mint mWildUSD
     */
    bytes32 public constant M_WILD_USD_MINT_OPERATOR_ROLE =
        keccak256("M_WILD_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mWildUSD
     */
    bytes32 public constant M_WILD_USD_BURN_OPERATOR_ROLE =
        keccak256("M_WILD_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mWildUSD
     */
    bytes32 public constant M_WILD_USD_PAUSE_OPERATOR_ROLE =
        keccak256("M_WILD_USD_PAUSE_OPERATOR_ROLE");

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
        return ("mWildUSD", "mWildUSD");
    }

    /**
     * @dev AC role, owner of which can mint mWildUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_WILD_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mWildUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_WILD_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mWildUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_WILD_USD_PAUSE_OPERATOR_ROLE;
    }
}
