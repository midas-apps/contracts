// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mArbETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mArbETH is mToken {
    /**
     * @notice actor that can mint mArbETH
     */
    bytes32 public constant M_ARB_ETH_MINT_OPERATOR_ROLE =
        keccak256("M_ARB_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mArbETH
     */
    bytes32 public constant M_ARB_ETH_BURN_OPERATOR_ROLE =
        keccak256("M_ARB_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mArbETH
     */
    bytes32 public constant M_ARB_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("M_ARB_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm Arbitrage ETH", "mArbETH");
    }

    /**
     * @dev AC role, owner of which can mint mArbETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_ARB_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mArbETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_ARB_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mArbETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_ARB_ETH_PAUSE_OPERATOR_ROLE;
    }
}
