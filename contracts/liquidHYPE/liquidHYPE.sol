// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title liquidHYPE
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract liquidHYPE is mTBILL {
    /**
     * @notice actor that can mint liquidHYPE
     */
    bytes32 public constant LIQUID_HYPE_MINT_OPERATOR_ROLE =
        keccak256("LIQUID_HYPE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn liquidHYPE
     */
    bytes32 public constant LIQUID_HYPE_BURN_OPERATOR_ROLE =
        keccak256("LIQUID_HYPE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause liquidHYPE
     */
    bytes32 public constant LIQUID_HYPE_PAUSE_OPERATOR_ROLE =
        keccak256("LIQUID_HYPE_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Liquid HYPE Yield", "liquidHYPE");
    }

    /**
     * @dev AC role, owner of which can mint liquidHYPE token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return LIQUID_HYPE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn liquidHYPE token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return LIQUID_HYPE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause liquidHYPE token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return LIQUID_HYPE_PAUSE_OPERATOR_ROLE;
    }
}
