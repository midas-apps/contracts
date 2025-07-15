// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title lstHYPE
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract lstHYPE is mTBILL {
    /**
     * @notice actor that can mint lstHYPE
     */
    bytes32 public constant LST_HYPE_MINT_OPERATOR_ROLE =
        keccak256("LST_HYPE_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn lstHYPE
     */
    bytes32 public constant LST_HYPE_BURN_OPERATOR_ROLE =
        keccak256("LST_HYPE_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause lstHYPE
     */
    bytes32 public constant LST_HYPE_PAUSE_OPERATOR_ROLE =
        keccak256("LST_HYPE_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("Hyperbeat LST Vault", "lstHYPE");
    }

    /**
     * @dev AC role, owner of which can mint lstHYPE token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return LST_HYPE_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn lstHYPE token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return LST_HYPE_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause lstHYPE token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return LST_HYPE_PAUSE_OPERATOR_ROLE;
    }
}
