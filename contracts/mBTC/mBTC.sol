// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mBTC is mTBILL {
    /**
     * @notice actor that can mint mBTC
     */
    bytes32 public constant M_BTC_MINT_OPERATOR_ROLE =
        keccak256("M_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mBTC
     */
    bytes32 public constant M_BTC_BURN_OPERATOR_ROLE =
        keccak256("M_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mBTC
     */
    bytes32 public constant M_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("M_BTC_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("mBTC", "mBTC");
    }

    /**
     * @dev AC role, owner of which can mint mBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_BTC_PAUSE_OPERATOR_ROLE;
    }
}
