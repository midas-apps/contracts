// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mRE7SOL
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mRE7SOL is mTBILL {
    /**
     * @notice actor that can mint mRE7SOL
     */
    bytes32 public constant M_RE7SOL_MINT_OPERATOR_ROLE =
        keccak256("M_RE7SOL_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mRE7SOL
     */
    bytes32 public constant M_RE7SOL_BURN_OPERATOR_ROLE =
        keccak256("M_RE7SOL_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mRE7SOL
     */
    bytes32 public constant M_RE7SOL_PAUSE_OPERATOR_ROLE =
        keccak256("M_RE7SOL_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Midas Re7SOL", "mRe7SOL");
    }

    /**
     * @dev AC role, owner of which can mint mRE7SOL token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_RE7SOL_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mRE7SOL token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_RE7SOL_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mRE7SOL token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_RE7SOL_PAUSE_OPERATOR_ROLE;
    }
}
