// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mEVETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mEVETH is mToken {
    /**
     * @notice actor that can mint mEVETH
     */
    bytes32 public constant M_EV_ETH_MINT_OPERATOR_ROLE =
        keccak256("M_EV_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mEVETH
     */
    bytes32 public constant M_EV_ETH_BURN_OPERATOR_ROLE =
        keccak256("M_EV_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mEVETH
     */
    bytes32 public constant M_EV_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("M_EV_ETH_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Everstake ETH", "mEVETH");
    }

    /**
     * @dev AC role, owner of which can mint mEVETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_EV_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mEVETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_EV_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mEVETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_EV_ETH_PAUSE_OPERATOR_ROLE;
    }
}
