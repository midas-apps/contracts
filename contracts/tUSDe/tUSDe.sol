// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title tUSDe
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract tUSDe is mTBILL {
    /**
     * @notice actor that can mint tUSDe
     */
    bytes32 public constant T_USDE_MINT_OPERATOR_ROLE =
        keccak256("T_USDE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn tUSDe
     */
    bytes32 public constant T_USDE_BURN_OPERATOR_ROLE =
        keccak256("T_USDE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause tUSDe
     */
    bytes32 public constant T_USDE_PAUSE_OPERATOR_ROLE =
        keccak256("T_USDE_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Terminal USDe", "tUSDe");
    }

    /**
     * @dev AC role, owner of which can mint tUSDe token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return T_USDE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn tUSDe token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return T_USDE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause tUSDe token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return T_USDE_PAUSE_OPERATOR_ROLE;
    }
}
