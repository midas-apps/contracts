// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title tBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract tBTC is mTBILL {
    /**
     * @notice actor that can mint tBTC
     */
    bytes32 public constant T_BTC_MINT_OPERATOR_ROLE =
        keccak256("T_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn tBTC
     */
    bytes32 public constant T_BTC_BURN_OPERATOR_ROLE =
        keccak256("T_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause tBTC
     */
    bytes32 public constant T_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("T_BTC_PAUSE_OPERATOR_ROLE");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControl contract
     */
    function initialize(address _accessControl) external override initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("Terminal WBTC", "tBTC");
    }

    /**
     * @dev AC role, owner of which can mint tBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return T_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn tBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return T_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause tBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return T_BTC_PAUSE_OPERATOR_ROLE;
    }
}
