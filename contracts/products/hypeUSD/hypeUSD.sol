// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../../mToken.sol";

/**
 * @title hypeUSD
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract hypeUSD is mToken {
    /**
     * @notice actor that can mint hypeUSD
     */
    bytes32 public constant HYPE_USD_MINT_OPERATOR_ROLE =
        keccak256("HYPE_USD_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn hypeUSD
     */
    bytes32 public constant HYPE_USD_BURN_OPERATOR_ROLE =
        keccak256("HYPE_USD_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause hypeUSD
     */
    bytes32 public constant HYPE_USD_PAUSE_OPERATOR_ROLE =
        keccak256("HYPE_USD_PAUSE_OPERATOR_ROLE");

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
        return ("HyperUSD Vault", "hypeUSD");
    }

    /**
     * @dev AC role, owner of which can mint hypeUSD token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return HYPE_USD_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn hypeUSD token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return HYPE_USD_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause hypeUSD token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return HYPE_USD_PAUSE_OPERATOR_ROLE;
    }
}
