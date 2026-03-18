// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./mToken.sol";

/**
 * @title mTokenPermissioned
 * @notice mToken with fully permissioned transfers
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
abstract contract mTokenPermissioned is mToken {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

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
     * @notice AC role of a greenlist
     * @return role bytes32 role
     */
    function _greenlistedRole() internal pure virtual returns (bytes32);

    /**
     * @dev checks that a given `account`
     * have `greenlistedRole()`
     */
    function _onlyGreenlisted(address account)
        private
        view
        onlyRole(_greenlistedRole(), account)
    {}
}
