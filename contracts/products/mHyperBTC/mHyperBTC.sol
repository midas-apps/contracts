// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mHyperBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mHyperBTC is mToken {
    /**
     * @notice actor that can mint mHyperBTC
     */
    bytes32 public constant M_HYPER_BTC_MINT_OPERATOR_ROLE =
        keccak256("M_HYPER_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mHyperBTC
     */
    bytes32 public constant M_HYPER_BTC_BURN_OPERATOR_ROLE =
        keccak256("M_HYPER_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mHyperBTC
     */
    bytes32 public constant M_HYPER_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("M_HYPER_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm BTC", "mHyperBTC");
    }

    /**
     * @dev AC role, owner of which can mint mHyperBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_HYPER_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mHyperBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_HYPER_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mHyperBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_HYPER_BTC_PAUSE_OPERATOR_ROLE;
    }
}
