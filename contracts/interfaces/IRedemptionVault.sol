// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

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
 * @param feePercent fixed fee percent that was calculated at request creation time
 * @param amountMTokenInstant amount of mToken that was redeemed instantly
 * @param approvedMTokenRate approved mToken rate
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
    uint256 amountMTokenInstant;
    uint256 approvedMTokenRate;
    uint8 version;
}

struct RedemptionVaultInitParams {
    address requestRedeemer;
}

struct RedemptionVaultV2InitParams {
    address loanLp;
    address loanLpFeeReceiver;
    address loanRepaymentAddress;
    address loanSwapperVault;
    uint64 maxLoanApr;
}

struct LiquidityProviderLoanRequest {
    /// @notice tokenOut address
    address tokenOut;
    /// @notice amount of tokenOut
    uint256 amountTokenOut;
    /// @notice amount of tokenOut fee
    uint256 amountFee;
    /// @notice timestamp of the request creation
    uint256 createdAt;
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
        address recipient,
        uint256 amount,
        uint256 feeAmount,
        uint256 amountTokenOut
    );

    /**
     * @param requestId request id
     * @param user function caller (msg.sender)
     * @param tokenOut address of tokenOut
     * @param recipient recipient address
     * @param amountMTokenIn amount of mToken
     * @param amountMTokenInstant amount of mToken that was redeemed instantly
     * @param mTokenRate mToken rate
     * @param feePercent fee percent
     */
    event RedeemRequestV2(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        address recipient,
        uint256 amountMTokenIn,
        uint256 amountMTokenInstant,
        uint256 mTokenRate,
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
     * @param newMTokenRate new mToken rate
     * @param isSafe if true, approval is safe
     * @param isAvgRate if true, newMtokenRate is avg rate
     */
    event ApproveRequestV2(
        uint256 indexed requestId,
        uint256 newMTokenRate,
        bool isSafe,
        bool isAvgRate
    );

    /**
     * @param requestId mint request id
     * @param user address of user
     */
    event RejectRequest(uint256 indexed requestId, address indexed user);

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
     * @param caller function caller (msg.sender)
     * @param newLoanRepaymentAddress new address of loan repayment address
     */
    event SetLoanRepaymentAddress(
        address indexed caller,
        address newLoanRepaymentAddress
    );

    /**
     * @param caller function caller (msg.sender)
     * @param newLoanSwapperVault new address of loan swapper vault
     */
    event SetLoanSwapperVault(
        address indexed caller,
        address newLoanSwapperVault
    );

    /**
     * @param caller function caller (msg.sender)
     * @param newMaxLoanApr new maximum loan APR value in basis points (100 = 1%)
     */
    event SetMaxLoanApr(address indexed caller, uint64 newMaxLoanApr);

    /**
     * @param caller function caller (msg.sender)
     * @param newLoanLpFirst new flag to determine if the loan LP liquidity should be used first
     */
    event SetLoanLpFirst(address indexed caller, bool newLoanLpFirst);

    /**
     * @param caller function caller (msg.sender)
     * @param requestId request id
     */
    event RepayLpLoanRequest(address indexed caller, uint256 indexed requestId);

    /**
     * @param caller function caller (msg.sender)
     * @param requestId request id
     */
    event CancelLpLoanRequest(
        address indexed caller,
        uint256 indexed requestId
    );

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
     * @notice creating redeem request
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
     * @notice
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mToken to redeem (decimals 18)
     * @param recipientRequest address that receives tokens for the request part
     * @param instantShare % amount of `amountMTokenIn` that will be redeemed instantly
     * @param minReceiveAmountInstantShare min receive amount for the instant share
     * @param recipientInstant address that receives tokens for the instant part
     * @return request id
     */
    function redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipientRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
    ) external returns (uint256);

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
     * @notice approving requests from the `requestIds` array with the
     * current mToken rate as avg rate. WONT fail even if there is not enough liquidity
     * to process all requests.
     * Does same validation as `safeApproveRequestAvgRate`.
     * Transfers tokenOut to users
     * Sets request flags to Processed.
     * @param requestIds request ids array
     */
    function safeBulkApproveRequestAvgRate(uint256[] calldata requestIds)
        external;

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
     * @notice approving requests from the `requestIds` array using the `avgMTokenRate`.
     * WONT fail even if there is not enough liquidity to process all requests.
     * Does same validation as `safeApproveRequestAvgRate`.
     * Transfers tokenOut to user
     * Sets request flags to Processed.
     * @param requestIds request ids array
     * @param avgMTokenRate avg mToken rate inputted by vault admin
     */
    function safeBulkApproveRequestAvgRate(
        uint256[] calldata requestIds,
        uint256 avgMTokenRate
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
     * @notice approving redeem request if not exceed tokenOut allowance
     * Burns amount mToken from contract
     * Transfers tokenOut to user
     * Sets flag Processed
     * @param requestId request id
     * @param avgMTokenRate avg mToken rate inputted by vault admin
     */
    function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate)
        external;

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
     * @notice approving request if inputted token rate fit price diviation percent
     * Burns amount mToken from contract
     * Transfers tokenOut to user
     * Sets flag Processed
     * @param requestId request id
     * @param avgMTokenRate avg mToken rate inputted by vault admin
     */
    function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate)
        external;

    /**
     * @notice rejecting request
     * Sets request flag to Canceled.
     * @param requestId request id
     */
    function rejectRequest(uint256 requestId) external;

    /**
     * @notice repaying loan requests from the `requestIds` array
     * Transfers tokenOut to loan repayment address
     * Transfers fee in tokenOut to loan lp fee receiver
     * Sets request flags to Processed.
     * @param requestIds request ids array
     * @param loanApr loan APR. Overrides calculated loan fee in case if
     * accrued interest is greater than the calculated loan fee.
     */
    function bulkRepayLpLoanRequest(
        uint256[] calldata requestIds,
        uint64 loanApr
    ) external;

    /**
     * @notice canceling loan request
     * Sets request flags to Canceled.
     * @param requestId request id
     */
    function cancelLpLoanRequest(uint256 requestId) external;

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
     * @notice set address of loan repayment address
     * @param newLoanRepaymentAddress new address of loan repayment address
     */
    function setLoanRepaymentAddress(address newLoanRepaymentAddress) external;

    /**
     * @notice set address of loan swapper vault
     * @param newLoanSwapperVault new address of loan swapper vault
     */
    function setLoanSwapperVault(address newLoanSwapperVault) external;

    /**
     * @notice set maximum loan APR value in basis points (100 = 1%)
     * @param newMaxLoanApr new maximum loan APR value in basis points (100 = 1%)
     */
    function setMaxLoanApr(uint64 newMaxLoanApr) external;

    /**
     * @notice set flag to determine if the loan LP liquidity should be used first
     * @param newLoanLpFirst new flag to determine if the loan LP liquidity should be used first
     */
    function setLoanLpFirst(bool newLoanLpFirst) external;
}
