// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mF-ONE
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mFONE is mTBILL {
    /**
     * @notice actor that can mint mF-ONE
     */
    bytes32 public constant M_FONE_MINT_OPERATOR_ROLE =
        keccak256("M_FONE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mF-ONE
     */
    bytes32 public constant M_FONE_BURN_OPERATOR_ROLE =
        keccak256("M_FONE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mF-ONE
     */
    bytes32 public constant M_FONE_PAUSE_OPERATOR_ROLE =
        keccak256("M_FONE_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Midas Fasanara ONE", "mF-ONE");
    }

    /**
     * @dev AC role, owner of which can mint mF-ONE token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_FONE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mF-ONE token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_FONE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mF-ONE token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_FONE_PAUSE_OPERATOR_ROLE;
    }
}
