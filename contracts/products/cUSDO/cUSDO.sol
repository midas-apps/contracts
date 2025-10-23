// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title cUSDO
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract cUSDO is mToken {
    /**
     * @notice actor that can mint cUSDO
     */
    bytes32 public constant C_USDO_MINT_OPERATOR_ROLE =
        keccak256("C_USDO_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn cUSDO
     */
    bytes32 public constant C_USDO_BURN_OPERATOR_ROLE =
        keccak256("C_USDO_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause cUSDO
     */
    bytes32 public constant C_USDO_PAUSE_OPERATOR_ROLE =
        keccak256("C_USDO_PAUSE_OPERATOR_ROLE");

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
        return ("cUSDO BNB Midas Vault", "cUSDO");
    }

    /**
     * @dev AC role, owner of which can mint cUSDO token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return C_USDO_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn cUSDO token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return C_USDO_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause cUSDO token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return C_USDO_PAUSE_OPERATOR_ROLE;
    }
}
