// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mToken.sol";

/**
 * @title hypeETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract hypeETH is mToken {
    /**
     * @notice actor that can mint hypeETH
     */
    bytes32 public constant HYPE_ETH_MINT_OPERATOR_ROLE =
        keccak256("HYPE_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn hypeETH
     */
    bytes32 public constant HYPE_ETH_BURN_OPERATOR_ROLE =
        keccak256("HYPE_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause hypeETH
     */
    bytes32 public constant HYPE_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("HYPE_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("HyperETH Vault", "hypeETH");
    }

    /**
     * @dev AC role, owner of which can mint hypeETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return HYPE_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn hypeETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return HYPE_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause hypeETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return HYPE_ETH_PAUSE_OPERATOR_ROLE;
    }
}
