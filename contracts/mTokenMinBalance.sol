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
     * @param user address of the user
     * @param isExempt bool if the user is exempt from min balance checks
     */
    event SetIsMinBalanceExempt(address indexed user, bool isExempt);

    /**
     * @notice mapping, user address => is exempt from min balance checks
     */
    mapping(address => bool) public isMinBalanceExempt;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice set if a user is exempt from min balance checks
     * @param user address of the user
     * @param isExempt bool if the user is exempt from min balance checks
     */
    function setIsMinBalanceExempt(address user, bool isExempt)
        external
        onlyRole(DEFAULT_ADMIN_ROLE, msg.sender)
    {
        if (isMinBalanceExempt[user] == isExempt) {
            return;
        }

        isMinBalanceExempt[user] = isExempt;
        emit SetIsMinBalanceExempt(user, isExempt);
    }

    /**
     * @dev overrides _afterTokenTransfer function to check if the recipient has a minimum balance
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from != address(0) && !isMinBalanceExempt[from]) {
            _validateMinBalance(from, true);
        }

        if (to != address(0) && !isMinBalanceExempt[to]) {
            _validateMinBalance(to, from != address(0));
        }

        super._afterTokenTransfer(from, to, amount);
    }

    /**
     * @dev validates the minimum balance of a user
     * @param user address of the user
     * @param canBeZero bool if the user can have a balance of 0
     */
    function _validateMinBalance(address user, bool canBeZero) internal view {
        uint256 balance = balanceOf(user);

        bool isMinBalanceMet = balance >= 1 ether;

        if (canBeZero) {
            isMinBalanceMet = balance == 0 || isMinBalanceMet;
        }

        require(isMinBalanceMet, "MTMB: min balance not met");
    }
}
