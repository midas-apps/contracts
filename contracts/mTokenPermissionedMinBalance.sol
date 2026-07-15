// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./mTokenPermissioned.sol";
import "./mTokenMinBalance.sol";

/**
 * @title mTokenPermissionedMinBalance
 * @notice mToken with permissioned transfers and minimum balance checks
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
abstract contract mTokenPermissionedMinBalance is
    mTokenMinBalance,
    mTokenPermissioned
{
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev overrides _beforeTokenTransfer function to call the parent hooks
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(mTokenPermissioned, mToken) {
        mTokenPermissioned._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev overrides _beforeTokenTransfer function to call the parent hooks
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(mTokenMinBalance, ERC20Upgradeable) {
        mTokenMinBalance._afterTokenTransfer(from, to, amount);
    }
}
