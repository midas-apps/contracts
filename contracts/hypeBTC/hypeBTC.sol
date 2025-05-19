// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;
import "../mTBILL/mTBILL.sol";

/**
 * @title hypeBTC
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract hypeBTC is mTBILL {
    /**
     * @notice actor that can mint hypeBTC
     */
    bytes32 public constant HYPE_BTC_MINT_OPERATOR_ROLE =
        keccak256("HYPE_BTC_MINT_OPERATOR_ROLE");

    /**
     * @notice actor that can burn hypeBTC
     */
    bytes32 public constant HYPE_BTC_BURN_OPERATOR_ROLE =
        keccak256("HYPE_BTC_BURN_OPERATOR_ROLE");

    /**
     * @notice actor that can pause hypeBTC
     */
    bytes32 public constant HYPE_BTC_PAUSE_OPERATOR_ROLE =
        keccak256("HYPE_BTC_PAUSE_OPERATOR_ROLE");

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
        __ERC20_init("HyperBTC Vault", "hypeBTC");
    }

    /**
     * @dev AC role, owner of which can mint hypeBTC token
     */
    function _minterRole() internal pure override returns (bytes32) {
        return HYPE_BTC_MINT_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can burn hypeBTC token
     */
    function _burnerRole() internal pure override returns (bytes32) {
        return HYPE_BTC_BURN_OPERATOR_ROLE;
    }

    /**
     * @dev AC role, owner of which can pause hypeBTC token
     */
    function _pauserRole() internal pure override returns (bytes32) {
        return HYPE_BTC_PAUSE_OPERATOR_ROLE;
    }
}
