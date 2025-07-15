// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title mAPOLLO
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mAPOLLO is mTBILL {
    /**
     * @notice actor that can mint mAPOLLO
     */
    bytes32 public constant M_APOLLO_MINT_OPERATOR_ROLE =
        keccak256("M_APOLLO_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn mAPOLLO
     */
    bytes32 public constant M_APOLLO_BURN_OPERATOR_ROLE =
        keccak256("M_APOLLO_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause mAPOLLO
     */
    bytes32 public constant M_APOLLO_PAUSE_OPERATOR_ROLE =
        keccak256("M_APOLLO_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Midas Apollo Crypto", "mAPOLLO");
    }

    /**
     * @dev AC role, owner of which can mint mAPOLLO token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return M_APOLLO_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn mAPOLLO token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return M_APOLLO_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause mAPOLLO token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return M_APOLLO_PAUSE_OPERATOR_ROLE;
    }
}
