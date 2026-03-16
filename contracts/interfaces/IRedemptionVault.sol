// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./IManageableVault.sol";

/**
 * @notice Legacy Redeem request scruct
 * @dev used for backward compatibility
 * @param sender user address who create
 * @param tokenOut tokenOut address
 * @param status request status
 * @param amountMToken amount mToken
 * @param mTokenRate rate of mToken at request creation time
 * @param tokenOutRate rate of tokenOut at request creation time
 */
struct Request {
    address sender;
    address tokenOut;
    RequestStatus status;
    uint256 amountMToken;
    uint256 mTokenRate;
    uint256 tokenOutRate;
}

/**
 * @notice Redeem request v2 scruct
 * @dev replaces `Request` struct and adds `feePercent` and `version` fields
 * @param sender user address who create
 * @param tokenOut tokenOut address
 * @param status request status
 * @param amountMToken amount mToken
 * @param mTokenRate rate of mToken at request creation time
 * @param tokenOutRate rate of tokenOut at request creation time
 * @param feePercent fee percent
 * @param version request version. 0 for legacy, 1 for v2
 */
struct RequestV2 {
    address sender;
    address tokenOut;
    RequestStatus status;
    uint256 amountMToken;
    uint256 mTokenRate;
    uint256 tokenOutRate;
    uint256 feePercent;
    uint8 version;
}

struct FiatRedemptionInitParams {
    uint256 fiatAdditionalFee;
    uint256 fiatFlatFee;
    uint256 minFiatRedeemAmount;
}

struct LiquidityProviderLoanRequest {
    /// @notice tokenOut address
    address tokenOut;
    /// @notice amount of tokenOut
    uint256 amountTokenOut;
    /// @notice amount of tokenOut fee
    uint256 amountFee;
    /// @notice status of the loan
    RequestStatus status;
}

/**
 * @title IRedemptionVault
 * @author RedDuck Software
 */
interface IRedemptionVault is IManageableVault {
    /**
     * @param user function caller (msg.sender)
     * @param tokenOut address of tokenOut
     * @param amount amount of mToken
     * @param feeAmount fee amount in tokenOut
     * @param amountTokenOut amount of tokenOut
     */
    event RedeemInstantV2(
        address indexed user,
        address indexed tokenOut,
        uint256 amount,
        uint256 feeAmount,
        uint256 amountTokenOut
    );

    /**
     * @param user function caller (msg.sender)
     * @param tokenOut address of tokenOut
     * @param recipient address that receives tokens
     * @param amount amount of mToken
     * @param feeAmount fee amount in tokenOut
     * @param amountTokenOut amount of tokenOut
     */
    event RedeemInstantWithCustomRecipientV2(
        address indexed user,
        address indexed tokenOut,
        address recipient,
        uint256 amount,
        uint256 feeAmount,
        uint256 amountTokenOut
    );

    /**
     * @param requestId request id
     * @param user function caller (msg.sender)
     * @param tokenOut address of tokenOut
     * @param amountMTokenIn amount of mToken
     * @param feePercent fee percent
     */
    event RedeemRequestV2(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        uint256 amountMTokenIn,
        uint256 feePercent
    );

    /**
     * @param requestId request id
     * @param user function caller (msg.sender)
     * @param tokenOut address of tokenOut
     * @param recipient address that receives tokens
     * @param amountMTokenIn amount of mToken
     * @param feePercent fee percent
     */
    event RedeemRequestWithCustomRecipientV2(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        address recipient,
        uint256 amountMTokenIn,
        uint256 feePercent
    );

    /**
     * @param loanId loan id
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut
     * @param amountFee fee amount in payment token
     * @param mTokenRate mToken rate
     * @param tokenOutRate tokenOut rate
     */
    event CreateLiquidityProviderLoanRequest(
        uint256 indexed loanId,
        address indexed tokenOut,
        uint256 amountTokenOut,
        uint256 amountFee,
        uint256 mTokenRate,
        uint256 tokenOutRate
    );

    /**
     * @param requestId mint request id
     * @param newMTokenRate net mToken rate
     */
    event ApproveRequest(uint256 indexed requestId, uint256 newMTokenRate);

    /**
     * @param requestId mint request id
     * @param newMTokenRate net mToken rate
     */
    event SafeApproveRequest(uint256 indexed requestId, uint256 newMTokenRate);

    /**
     * @param requestId mint request id
     * @param user address of user
     */
    event RejectRequest(uint256 indexed requestId, address indexed user);

    /**
     * @param caller function caller (msg.sender)
     * @param newMinAmount new min amount for fiat requests
     */
    event SetMinFiatRedeemAmount(address indexed caller, uint256 newMinAmount);

    /**
     * @param caller function caller (msg.sender)
     * @param feeInMToken fee amount in mToken
     */
    event SetFiatFlatFee(address indexed caller, uint256 feeInMToken);

    /**
     * @param caller function caller (msg.sender)
     * @param newfee new fiat fee percent 1% = 100
     */
    event SetFiatAdditionalFee(address indexed caller, uint256 newfee);

    /**
     * @param caller function caller (msg.sender)
     * @param redeemer new address of request redeemer
     */
    event SetRequestRedeemer(address indexed caller, address redeemer);

    /**
     * @param caller function caller (msg.sender)
     * @param newLoanLpFeeReceiver new address of loan liquidity provider fee receiver
     */
    event SetLoanLpFeeReceiver(
        address indexed caller,
        address newLoanLpFeeReceiver
    );

    /**
     * @param caller function caller (msg.sender)
     * @param newLoanLp new address of loan liquidity provider
     */
    event SetLoanLp(address indexed caller, address newLoanLp);

    /**
     * @notice redeem mToken to tokenOut if daily limit and allowance not exceeded
     * Burns mToken from the user.
     * Transfers fee in mToken to feeReceiver
     * Transfers tokenOut to user.
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mToken to redeem (decimals 18)
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount
    ) external;

    /**
     * @notice Does the same as original `redeemInstant` but allows specifying a custom tokensReceiver address.
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mToken to redeem (decimals 18)
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     * @param recipient address that receives tokens
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    ) external;

    /**
     * @notice creating redeem request if tokenOut not fiat
     * Transfers amount in mToken to contract
     * Transfers fee in mToken to feeReceiver
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mToken to redeem (decimals 18)
     * @return request id
     */
    function redeemRequest(address tokenOut, uint256 amountMTokenIn)
        external
        returns (uint256);

    /**
     * @notice Does the same as original `redeemRequest` but allows specifying a custom tokensReceiver address.
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mToken to redeem (decimals 18)
     * @param recipient address that receives tokens
     * @return request id
     */
    function redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipient
    ) external returns (uint256);

    /**
     * @notice creating redeem request if tokenOut is fiat
     * Transfers amount in mToken to contract
     * Transfers fee in mToken to feeReceiver
     * @param amountMTokenIn amount of mToken to redeem (decimals 18)
     * @return request id
     */
    function redeemFiatRequest(uint256 amountMTokenIn)
        external
        returns (uint256);

    /**
     * @notice approving requests from the `requestIds` array with the mToken rate
     * from the request. WONT fail even if there is not enough liquidity
     * to process all requests.
     * Does same validation as `safeApproveRequest`.
     * Transfers tokenOut to users
     * Sets request flags to Processed.
     * @param requestIds request ids array
     */
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external;

    /**
     * @notice approving requests from the `requestIds` array with the
     * current mToken rate. WONT fail even if there is not enough liquidity
     * to process all requests.
     * Does same validation as `safeApproveRequest`.
     * Transfers tokenOut to users
     * Sets request flags to Processed.
     * @param requestIds request ids array
     */
    function safeBulkApproveRequest(uint256[] calldata requestIds) external;

    /**
     * @notice approving requests from the `requestIds` array using the `newMTokenRate`.
     * WONT fail even if there is not enough liquidity to process all requests.
     * Does same validation as `safeApproveRequest`.
     * Transfers tokenOut to user
     * Sets request flags to Processed.
     * @param requestIds request ids array
     * @param newMTokenRate new mToken rate inputted by vault admin
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newMTokenRate
    ) external;

    /**
     * @notice approving redeem request if not exceed tokenOut allowance
     * Burns amount mToken from contract
     * Transfers tokenOut to user
     * Sets flag Processed
     * @param requestId request id
     * @param newMTokenRate new mToken rate inputted by vault admin
     */
    function approveRequest(uint256 requestId, uint256 newMTokenRate) external;

    /**
     * @notice approving request if inputted token rate fit price diviation percent
     * Burns amount mToken from contract
     * Transfers tokenOut to user
     * Sets flag Processed
     * @param requestId request id
     * @param newMTokenRate new mToken rate inputted by vault admin
     */
    function safeApproveRequest(uint256 requestId, uint256 newMTokenRate)
        external;

    /**
     * @notice rejecting request
     * Sets request flag to Canceled.
     * @param requestId request id
     */
    function rejectRequest(uint256 requestId) external;

    /**
     * @notice set new min amount for fiat requests
     * @param newValue new min amount
     */
    function setMinFiatRedeemAmount(uint256 newValue) external;

    /**
     * @notice set fee amount in mToken for fiat requests
     * @param feeInMToken fee amount in mToken
     */
    function setFiatFlatFee(uint256 feeInMToken) external;

    /**
     * @notice set new fee percent for fiat requests
     * @param newFee new fee percent 1% = 100
     */
    function setFiatAdditionalFee(uint256 newFee) external;

    /**
     * @notice set address which is designated for standard redemptions, allowing tokens to be pulled from this address
     * @param redeemer new address of request redeemer
     */
    function setRequestRedeemer(address redeemer) external;

    /**
     * @notice set address of loan liquidity provider fee receiver
     * @param newLoanLpFeeReceiver new address of loan liquidity provider fee receiver
     */
    function setLoanLpFeeReceiver(address newLoanLpFeeReceiver) external;

    /**
     * @notice set address of loan liquidity provider
     * @param newLoanLp new address of loan liquidity provider
     */
    function setLoanLp(address newLoanLp) external;

    /**
     * @notice backward compatibility function for getting V1 request struct
     * @dev wont fail even if request by given id is V2
     * @param requestId request id
     * @return request
     */
    function redeemRequests(uint256 requestId)
        external
        view
        returns (Request memory);

    /**
     * @notice get redeem request v2
     * @param requestId request id
     * @return request
     */
    function redeemRequestsV2(uint256 requestId)
        external
        view
        returns (RequestV2 memory);
}
