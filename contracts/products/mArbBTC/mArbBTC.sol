// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../mToken.sol";

/**
 * @title mArbBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mArbBTC is mToken {
    /**
     * @notice actor that can mint mArbBTC
     */
    bytes32 public constant M_ARB_BTC_MINT_OPERATOR_ROLE =
        keccak256("M_ARB_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mArbBTC
     */
    bytes32 public constant M_ARB_BTC_BURN_OPERATOR_ROLE =
        keccak256("M_ARB_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mArbBTC
     */
    bytes32 public constant M_ARB_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("M_ARB_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("Midas Hyperithm Arbitrage BTC", "mArbBTC");
    }

    /**
     * @dev AC role, owner of which can mint mArbBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_ARB_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mArbBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_ARB_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mArbBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_ARB_BTC_PAUSE_OPERATOR_ROLE;
    }
}
