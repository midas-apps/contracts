// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mLIQUIDITY
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mLIQUIDITY is mTBILL {
    /**
     * @notice actor that can mint mLIQUIDITY
     */
    bytes32 public constant M_LIQUIDITY_MINT_OPERATOR_ROLE =
        keccak256("M_LIQUIDITY_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mLIQUIDITY
     */
    bytes32 public constant M_LIQUIDITY_BURN_OPERATOR_ROLE =
        keccak256("M_LIQUIDITY_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mLIQUIDITY
     */
    bytes32 public constant M_LIQUIDITY_PAUSE_OPERATOR_ROLE =
        keccak256("M_LIQUIDITY_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Midas mLIQUIDITY", "mLIQUIDITY");
    }

    /**
     * @dev AC role, owner of which can mint mLIQUIDITY token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_LIQUIDITY_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mLIQUIDITY token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_LIQUIDITY_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mLIQUIDITY token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_LIQUIDITY_PAUSE_OPERATOR_ROLE;
    }
}
