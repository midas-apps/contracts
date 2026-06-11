// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {AccessControlUtilsLibrary} from "./libraries/AccessControlUtilsLibrary.sol";

import {mToken} from "./mToken.sol";

/**
 * @title mTokenPermissioned
 * @notice mToken with fully permissioned transfers
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
contract mTokenPermissioned is mToken {
    /**
     * @dev role that grants greenlisted rights to the contract
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _GREENLISTED_ROLE;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice constructor
     * @param _contractAdminRole contract admin role
     * @param _minterRole minter role
     * @param _burnerRole burner role
     * @param _greenlistedRole greenlisted role
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(
        bytes32 _contractAdminRole,
        bytes32 _minterRole,
        bytes32 _burnerRole,
        bytes32 _greenlistedRole
    ) mToken(_contractAdminRole, _minterRole, _burnerRole) {
        _GREENLISTED_ROLE = _greenlistedRole;
    }

    /**
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function greenlistedRole() public view virtual returns (bytes32) {
        return _GREENLISTED_ROLE;
    }

    /**
     * @dev overrides _beforeTokenTransfer function to allow
     * greenlisted users to use the token transfers functions
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(mToken) {
        if (to != address(0)) {
            if (from != address(0)) {
                _onlyGreenlisted(from);
            }
            _onlyGreenlisted(to);
        }

        mToken._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev checks that a given `account` has `greenlistedRole()`
     */
    function _onlyGreenlisted(address account) private view {
        AccessControlUtilsLibrary.requireGreenlisted(
            accessControl,
            account,
            greenlistedRole()
        );
    }
}
