// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mHyperETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mHyperETH is mToken {
    /**
     * @notice actor that can mint mHyperETH
     */
    bytes32 public constant M_HYPER_ETH_MINT_OPERATOR_ROLE =
        keccak256("M_HYPER_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mHyperETH
     */
    bytes32 public constant M_HYPER_ETH_BURN_OPERATOR_ROLE =
        keccak256("M_HYPER_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mHyperETH
     */
    bytes32 public constant M_HYPER_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("M_HYPER_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm ETH", "mHyperETH");
    }

    /**
     * @dev AC role, owner of which can mint mHyperETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_HYPER_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mHyperETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_HYPER_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mHyperETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_HYPER_ETH_PAUSE_OPERATOR_ROLE;
    }
}
