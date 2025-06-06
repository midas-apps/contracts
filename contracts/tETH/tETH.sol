// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title tETH
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract tETH is mTBILL {
    /**
     * @notice actor that can mint tETH
     */
    bytes32 public constant T_ETH_MINT_OPERATOR_ROLE =
        keccak256("T_ETH_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn tETH
     */
    bytes32 public constant T_ETH_BURN_OPERATOR_ROLE =
        keccak256("T_ETH_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause tETH
     */
    bytes32 public constant T_ETH_PAUSE_OPERATOR_ROLE =
        keccak256("T_ETH_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Terminal WETH", "tETH");
    }

    /**
     * @dev AC role, owner of which can mint tETH token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return T_ETH_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn tETH token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return T_ETH_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause tETH token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return T_ETH_PAUSE_OPERATOR_ROLE;
    }
}
