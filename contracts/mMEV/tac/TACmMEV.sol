// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../../mTBILL/mTBILL.sol";

/**
 * @title TACmMEV
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract TACmMEV is mTBILL {
    /**
     * @notice actor that can mint TACmMEV
     */
    bytes32 public constant TAC_M_MEV_MINT_OPERATOR_ROLE =
        keccak256("TAC_M_MEV_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn TACmMEV
     */
    bytes32 public constant TAC_M_MEV_BURN_OPERATOR_ROLE =
        keccak256("TAC_M_MEV_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause TACmMEV
     */
    bytes32 public constant TAC_M_MEV_PAUSE_OPERATOR_ROLE =
        keccak256("TAC_M_MEV_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Midas TACmMEV Token", "TACmMEV");
    }

    /**
     * @dev AC role, owner of which can mint TACmMEV token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return TAC_M_MEV_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn TACmMEV token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return TAC_M_MEV_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause TACmMEV token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return TAC_M_MEV_PAUSE_OPERATOR_ROLE;
    }
}
