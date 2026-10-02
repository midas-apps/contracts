// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./mToken.sol";

/**
 * @title mTokenMinBalance
 * @notice mToken with minimum balance checks
 * @author RedDuck Software
 */
//solhint-disable contract-name-camelcase
abstract contract mTokenMinBalance is mToken {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev overrides _afterTokenTransfer function to check if the recipient has a minimum balance
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from != address(0) && !_isMinBalanceExempt(from)) {
            _validateMinBalance(from);
        }

        if (to != address(0) && !_isMinBalanceExempt(to)) {
            _validateMinBalance(to);
        }

        super._afterTokenTransfer(from, to, amount);
    }

    /**
     * @dev returns the role holder of which is exempt from min balance checks
     */
    function _minBalanceExemptRole() internal view virtual returns (bytes32);

    /**
     * @dev checks if a user is exempt from min balance checks
     * @param user address of the user
     * @return bool true if the user is exempt from min balance checks
     */
    function _isMinBalanceExempt(address user) private view returns (bool) {
        return accessControl.hasRole(_minBalanceExemptRole(), user);
    }

    /**
     * @dev validates the minimum balance of a user
     * @param user address of the user
     */
    function _validateMinBalance(address user) private view {
        uint256 balance = balanceOf(user);
        require(
            balance == 0 || balance >= 1 ether,
            "MTMB: min balance not met"
        );
    }
}
