// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mToken.sol";

/**
 * @title hbUSDT
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract hbUSDT is mToken {
    /**
     * @notice actor that can mint hbUSDT
     */
    bytes32 public constant HB_USDT_MINT_OPERATOR_ROLE =
        keccak256("HB_USDT_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn hbUSDT
     */
    bytes32 public constant HB_USDT_BURN_OPERATOR_ROLE =
        keccak256("HB_USDT_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause hbUSDT
     */
    bytes32 public constant HB_USDT_PAUSE_OPERATOR_ROLE =
        keccak256("HB_USDT_PAUSE_OPERATOR_ROLE");

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
        return ("Hyperbeat USDT", "hbUSDT");
    }

    /**
     * @dev AC role, owner of which can mint hbUSDT token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return HB_USDT_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn hbUSDT token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return HB_USDT_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause hbUSDT token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return HB_USDT_PAUSE_OPERATOR_ROLE;
    }
}
