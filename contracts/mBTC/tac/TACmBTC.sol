// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../../mToken.sol";

/**
 * @title TACmBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract TACmBTC is mToken {
    /**
     * @notice actor that can mint TACmBTC
     */
    bytes32 public constant TAC_M_BTC_MINT_OPERATOR_ROLE =
        keccak256("TAC_M_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn TACmBTC
     */
    bytes32 public constant TAC_M_BTC_BURN_OPERATOR_ROLE =
        keccak256("TAC_M_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause TACmBTC
     */
    bytes32 public constant TAC_M_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("TAC_M_BTC_PAUSE_OPERATOR_ROLE");

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
        return ("Midas TACmBTC Token", "TACmBTC");
    }

    /**
     * @dev AC role, owner of which can mint TACmBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return TAC_M_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn TACmBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return TAC_M_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause TACmBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return TAC_M_BTC_PAUSE_OPERATOR_ROLE;
    }
}
