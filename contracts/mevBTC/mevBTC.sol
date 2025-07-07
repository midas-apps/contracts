// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mevBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mevBTC is mTBILL {
    /**
     * @notice actor that can mint mevBTC
     */
    bytes32 public constant MEV_BTC_MINT_OPERATOR_ROLE =
        keccak256("MEV_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mevBTC
     */
    bytes32 public constant MEV_BTC_BURN_OPERATOR_ROLE =
        keccak256("MEV_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mevBTC
     */
    bytes32 public constant MEV_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("MEV_BTC_PAUSE_OPERATOR_ROLE");

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _accessControl address of MidasAccessControll contract
     */
    function initialize(address _accessControl) external override initializer {
        __Blacklistable_init(_accessControl);
        __ERC20_init("Bitcoin MEV Capital", "mevBTC");
    }

    /**
     * @dev AC role, owner of which can mint mevBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return MEV_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mevBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return MEV_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mevBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return MEV_BTC_PAUSE_OPERATOR_ROLE;
    }
}
