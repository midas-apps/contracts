// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../mToken.sol";

//solhint-disable contract-name-camelcase
contract mTokenTest is mToken {
    bytes32 public constant M_TOKEN_TEST_MINT_OPERATOR_ROLE =
        keccak256("M_TOKEN_TEST_MINT_OPERATOR_ROLE");

    bytes32 public constant M_TOKEN_TEST_BURN_OPERATOR_ROLE =
        keccak256("M_TOKEN_TEST_BURN_OPERATOR_ROLE");

    bytes32 public constant M_TOKEN_TEST_PAUSE_OPERATOR_ROLE =
        keccak256("M_TOKEN_TEST_PAUSE_OPERATOR_ROLE");

    function _disableInitializers() internal override {}

    function _getNameSymbol()
        internal
        pure
        override
        returns (string memory, string memory)
    {
        return ("mTokenTest", "mTokenTest");
    }

    function _minterRole() internal pure override returns (bytes32) {
        return M_TOKEN_TEST_MINT_OPERATOR_ROLE;
    }

    function _burnerRole() internal pure override returns (bytes32) {
        return M_TOKEN_TEST_BURN_OPERATOR_ROLE;
    }

    function _pauserRole() internal pure override returns (bytes32) {
        return M_TOKEN_TEST_PAUSE_OPERATOR_ROLE;
    }
}
