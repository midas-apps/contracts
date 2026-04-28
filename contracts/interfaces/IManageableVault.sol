// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "./IMToken.sol";
import "./IDataFeed.sol";

/**
 * @notice Payment token config
 */
struct TokenConfig {
    /// @notice data feed token/USD address
    address dataFeed;
    /// @notice fee by token, 1% = 100
    uint256 fee;
    /// @notice token allowance (decimals 18)
    uint256 allowance;
    /// @notice stablecoin flag
    bool stable;
}

/**
 * @notice Rate limit configuration
 */
struct LimitConfig {
    /// @notice limit amount per window
    uint256 limit;
    /// @notice limitUsed amount used within the last epoch
    uint256 limitUsed;
    /// @notice last epoch id
    uint256 lastEpoch;
}

enum RequestStatus {
    Pending,
    Processed,
    Canceled
}

/**
 * @notice Common vault init params (v1)
 */
struct CommonVaultInitParams {
    /// @notice address of the access control contract
    address ac;
    /// @notice address of the sanctions list contract
    address sanctionsList;
    /// @notice variation tolerance of mToken rates for "safe" requests approve
    uint256 variationTolerance;
    /// @notice minimum amount for operations in mToken
    uint256 minAmount;
    /// @notice mToken address
    address mToken;
    /// @notice mToken data feed address
    address mTokenDataFeed;
    /// @notice address to which proceeds will be sent
    address tokensReceiver;
    /// @notice address to which fees will be sent
    address feeReceiver;
    /// @notice fee for initial operations 1% = 100
    uint256 instantFee;
}

/**
 * @notice Limit config init params
 */
struct LimitConfigInitParams {
    /// @notice window duration in seconds
    uint256 window;
    /// @notice limit amount per window
    uint256 limit;
}

/**
 * @notice Common vault init params (v2)
 */
struct CommonVaultV2InitParams {
    /// @notice minimum instant fee
    uint64 minInstantFee;
    /// @notice maximum instant fee
    uint64 maxInstantFee;
    /// @notice maximum instant share value in basis points (100 = 1%)
    uint64 maxInstantShare;
    /// @notice limit configs
    LimitConfigInitParams[] limitConfigs;
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
     * @param caller function caller (msg.sender)
     * @param token address of token that
     * @param dataFeed token dataFeed address
     * @param fee fee 1% = 100
     * @param allowance token allowance (decimals 18)
     * @param stable stablecoin flag
     */
    event AddPaymentToken(
        address indexed caller,
        address indexed token,
        address indexed dataFeed,
        uint256 fee,
        uint256 allowance,
        bool stable
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
     * @param newMinInstantFee new minimum instant fee
     * @param newMaxInstantFee new maximum instant fee
     */
    event SetMinMaxInstantFee(
        address indexed caller,
        uint64 newMinInstantFee,
        uint64 newMaxInstantFee
    );
    /**
     * @param caller function caller (msg.sender)
     * @param newAmount new min amount for operation
     */
    event SetMinAmount(address indexed caller, uint256 newAmount);

    /**
     * @param caller function caller (msg.sender)
     * @param window window duration in seconds
     * @param limit limit amount per window
     */
    event SetInstantLimitConfig(
        address indexed caller,
        uint256 indexed window,
        uint256 limit
    );

    /**
     * @param caller function caller (msg.sender)
     * @param newMaxInstantShare new maximum instant share value in basis points (100 = 1%)
     */
    event SetMaxInstantShare(address indexed caller, uint64 newMaxInstantShare);

    /**
     * @param caller function caller (msg.sender)
     * @param window window duration in seconds
     */
    event RemoveInstantLimitConfig(
        address indexed caller,
        uint256 indexed window
    );

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
     * @param caller function caller (msg.sender)
     * @param reciever new reciever address
     */
    event SetTokensReceiver(address indexed caller, address indexed reciever);

    /**
     * @param caller function caller (msg.sender)
     * @param newMaxApproveRequestId new max requestId that can be approved
     */
    event SetMaxApproveRequestId(
        address indexed caller,
        uint256 newMaxApproveRequestId
    );

    /**
     * @param user user address
     * @param enable is enabled
     */
    event FreeFromMinAmount(address indexed user, bool enable);

    /**
     * @notice The mTokenDataFeed contract address.
     * @return The address of the mTokenDataFeed contract.
     */
    function mTokenDataFeed() external view returns (IDataFeed);

    /**
     * @notice The mToken contract address.
     * @return The address of the mToken contract.
     */
    function mToken() external view returns (IMToken);

    /**
     * @notice adds a token to the stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     * @param dataFeed dataFeed address
     * @param fee 1% = 100
     * @param allowance token allowance (decimals 18)
     * @param stable is stablecoin flag
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 fee,
        uint256 allowance,
        bool stable
    ) external;

    /**
     * @notice removes a token from stablecoins list.
     * can be called only from permissioned actor.
     * @param token token address
     */
    function removePaymentToken(address token) external;

    /**
     * @notice set new token allowance.
     * if type(uint256).max = infinite allowance
     * prev allowance rewrites by new
     * can be called only from permissioned actor.
     * @param token token address
     * @param allowance new allowance (decimals 18)
     */
    function changeTokenAllowance(address token, uint256 allowance) external;

    /**
     * @notice set new token fee.
     * can be called only from permissioned actor.
     * @param token token address
     * @param fee new fee percent 1% = 100
     */
    function changeTokenFee(address token, uint256 fee) external;

    /**
     * @notice set new prices diviation percent.
     * can be called only from permissioned actor.
     * @param tolerance new prices diviation percent 1% = 100
     */
    function setVariationTolerance(uint256 tolerance) external;

    /**
     * @notice set new min amount.
     * can be called only from permissioned actor.
     * @param newAmount min amount for operations in mToken
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
     * @notice set new reciever for tokens.
     * can be called only from permissioned actor.
     * @param reciever new token reciever address
     */
    function setTokensReceiver(address reciever) external;

    /**
     * @notice set operation fee percent.
     * can be called only from permissioned actor.
     * @param newInstantFee new instant operations fee percent 1& = 100
     */
    function setInstantFee(uint256 newInstantFee) external;

    /**
     * @notice set new minimum/maximum instant fee
     * @param newMinInstantFee new minimum instant fee
     * @param newMaxInstantFee new maximum instant fee
     */
    function setMinMaxInstantFee(
        uint64 newMinInstantFee,
        uint64 newMaxInstantFee
    ) external;

    /**
     * @notice set operation limit configs.
     * can be called only from permissioned actor.
     * @param window window duration in seconds
     * @param limit limit amount per window
     */
    function setInstantLimitConfig(uint256 window, uint256 limit) external;

    /**
     * @notice set maximum instant share value in basis points (100 = 1%)
     * @param newMaxInstantShare new maximum instant share value in basis points (100 = 1%)
     */
    function setMaxInstantShare(uint64 newMaxInstantShare) external;

    /**
     * @notice sets max requestId that can be approved
     * @param newMaxApproveRequestId new max requestId that can be approved
     */
    function setMaxApproveRequestId(uint256 newMaxApproveRequestId) external;

    /**
     * @notice remove operation limit config.
     * can be called only from permissioned actor.
     * @param window window duration in seconds
     */
    function removeInstantLimitConfig(uint256 window) external;

    /**
     * @notice frees given `user` from the minimal deposit
     * amount validation in `initiateDepositRequest`
     * @param user address of user
     */
    function freeFromMinAmount(address user, bool enable) external;

    /**
     * @notice withdraws `amount` of a given `token` from the contract
     * to the `tokensReceiver` address
     * @param token token address
     * @param amount token amount
     */
    function withdrawToken(address token, uint256 amount) external;
}
