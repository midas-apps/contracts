// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title msyrupUSDp
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract msyrupUSDp is mToken {
    /**
     * @notice actor that can mint msyrupUSDp
     */
    bytes32 public constant M_SYRUP_USDP_MINT_OPERATOR_ROLE =
        keccak256("M_SYRUP_USDP_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn msyrupUSDp
     */
    bytes32 public constant M_SYRUP_USDP_BURN_OPERATOR_ROLE =
        keccak256("M_SYRUP_USDP_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause msyrupUSDp
     */
    bytes32 public constant M_SYRUP_USDP_PAUSE_OPERATOR_ROLE =
        keccak256("M_SYRUP_USDP_PAUSE_OPERATOR_ROLE");

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
        return ("Plasma syrupUSD Pre-deposit Midas Vault", "msyrupUSDp");
    }

    /**
     * @dev AC role, owner of which can mint msyrupUSDp token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_SYRUP_USDP_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn msyrupUSDp token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_SYRUP_USDP_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause msyrupUSDp token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_SYRUP_USDP_PAUSE_OPERATOR_ROLE;
    }
}
