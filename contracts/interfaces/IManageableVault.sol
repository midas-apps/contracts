// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/**
 * @param dataFeed data feed token/USD address
 * @param fee fee by token, 1% = 100
 * @param allowance token allowance
 */
struct TokenConfig {
    address dataFeed;
    uint256 fee;
    uint256 allowance;
}

enum RequestStatus {
    Pending,
    Processed,
    Canceled
}

/**
 * @title IManageableVault
 * @author RedDuck Software
 */
interface IManageableVault {
    /**
     * @param caller function caller (msg.sender)
     * @param token token that was withdrawn
     * @param withdrawTo address to which tokens were withdrawn
     * @param amount `token` transfer amount
     */
    event WithdrawToken(
        address indexed caller,
        address indexed token,
        address indexed withdrawTo,
        uint256 amount
    );

    /**
     * @param token address of token that
     * @param dataFeed token dataFeed address
     * @param fee fee 1% = 100
     * @param caller function caller (msg.sender)
     */
    event AddPaymentToken(
        address indexed token,
        address indexed dataFeed,
        uint256 fee,
        address indexed caller
    );

    /**
     * @param token address of token that
     * @param caller function caller (msg.sender)
     * @param allowance new allowance
     */
    event ChangeTokenAllowance(
        address indexed token,
        address indexed caller,
        uint256 allowance
    );

    /**
     * @param token address of token that
     * @param caller function caller (msg.sender)
     * @param fee new fee
     */
    event ChangeTokenFee(
        address indexed token,
        address indexed caller,
        uint256 fee
    );

    /**
     * @param token address of token that
     * @param caller function caller (msg.sender)
     */
    event RemovePaymentToken(address indexed token, address indexed caller);

    /**
     * @param account address of account
     * @param caller function caller (msg.sender)
     */
    event AddWaivedFeeAccount(address indexed account, address indexed caller);

    /**
     * @param account address of account
     * @param caller function caller (msg.sender)
     */
    event RemoveWaivedFeeAccount(
        address indexed account,
        address indexed caller
    );

    /**
     * @param caller function caller (msg.sender)
     * @param newFee new operation fee value
     */
    event SetInstantFee(address indexed caller, uint256 newFee);

    /**
     * @param caller function caller (msg.sender)
     * @param newAmount new min amount for operation
     */
    event SetMinAmount(address indexed caller, uint256 newAmount);

    /**
     * @param caller function caller (msg.sender)
     * @param newLimit new operation daily limit
     */
    event SetInstantDailyLimit(address indexed caller, uint256 newLimit);

    /**
     * @param caller function caller (msg.sender)
     * @param newTolerance percent of price diviation 1% = 100
     */
    event SetVariationTolerance(address indexed caller, uint256 newTolerance);

    /**
     * @param caller function caller (msg.sender)
     * @param reciever new reciever address
     */
    event SetFeeReceiver(address indexed caller, address indexed reciever);

    /**
     * @param user user address
     * @param enable is enabled
     */
    event FreeFromMinAmount(address indexed user, bool enable);

    /**
     * @notice withdraws `amount` of a given `token` from the contract.
     * can be called only from permissioned actor.
     * @param token token address
     * @param amount token amount
     * @param withdrawTo withdraw destination address
     */
    function withdrawToken(
        address token,
        uint256 amount,
        address withdrawTo
    ) external;

    /**
     * @notice adds a token to the stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     * @param dataFeed dataFeed address
     * @param fee 1% = 100
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 fee
    ) external;

    /**
     * @notice removes a token from stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function removePaymentToken(address token) external;

    /**
     * @notice set new token allowance.
     * if MAX_UINT = infinite allowance
     * prev allowance rewrites by new
     * can be called only from permissioned actor.
     * @param token token address
     * @param allowance new allowance
     */
    function changeTokenAllowance(address token, uint256 allowance) external;

    /**
     * @notice set new token fee.
     * can be called only from permissioned actor.
     * @param token token address
     * @param fee new fee
     */
    function changeTokenFee(address token, uint256 fee)
        external;

    /**
     * @notice set new prices diviation percent.
     * can be called only from permissioned actor.
     * @param tolerance new prices diviation percent 1% = 100
     */
    function setVariationTolerance(uint256 tolerance) external;

    /**
     * @notice set new min amount.
     * can be called only from permissioned actor.
     * @param newAmount min amount for operations in tokenIn
     */
    function setMinAmount(uint256 newAmount) external;

    /**
     * @notice adds a account to waived fee restriction.
     * can be called only from permissioned actor.
     * @param account user address
     */
    function addWaivedFeeAccount(address account) external;

    /**
     * @notice removes a account from waived fee restriction.
     * can be called only from permissioned actor.
     * @param account user address
     */
    function removeWaivedFeeAccount(address account) external;

    /**
     * @notice set new reciever for fees.
     * can be called only from permissioned actor.
     * @param reciever new fee reciever address
     */
    function setFeeReceiver(address reciever) external;

    /**
     * @notice set operation fee percent.
     * can be called only from permissioned actor.
     * @param newInstantFee new operation fee value
     */
    function setInstantFee(uint256 newInstantFee) external;

    /**
     * @notice set operation daily limit.
     * can be called only from permissioned actor.
     * @param newInstantDailyLimit new operation daily limit
     */
    function setInstantDailyLimit(uint256 newInstantDailyLimit) external;

    /**
     * @notice frees given `user` from the minimal deposit
     * amount validation in `initiateDepositRequest`
     * @param user address of user
     */
    function freeFromMinAmount(address user, bool enable) external;
}
