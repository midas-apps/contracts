// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title moriniGoldYield
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract moriniGoldYield is mToken {
    /**
     * @notice actor that can mint moriniGoldYield
     */
    bytes32 public constant MORINI_GOLD_YIELD_MINT_OPERATOR_ROLE =
        keccak256("MORINI_GOLD_YIELD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn moriniGoldYield
     */
    bytes32 public constant MORINI_GOLD_YIELD_BURN_OPERATOR_ROLE =
        keccak256("MORINI_GOLD_YIELD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause moriniGoldYield
     */
    bytes32 public constant MORINI_GOLD_YIELD_PAUSE_OPERATOR_ROLE =
        keccak256("MORINI_GOLD_YIELD_PAUSE_OPERATOR_ROLE");

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
        return ("Morini Gold Yield Vault", "MoriniGoldYield");
    }

    /**
     * @dev AC role, owner of which can mint moriniGoldYield token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return MORINI_GOLD_YIELD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn moriniGoldYield token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return MORINI_GOLD_YIELD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause moriniGoldYield token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return MORINI_GOLD_YIELD_PAUSE_OPERATOR_ROLE;
    }
}
