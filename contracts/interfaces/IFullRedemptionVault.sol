// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

/**
 * @notice Status of a full redemption request
 * @dev `Completed`, `Reallocated` and `Cancelled` are final
 */
enum FullRedemptionStatus {
    Submitted,
    ReadyToRedeem,
    PartiallyRedeemed,
    Completed,
    Reallocated,
    Cancelled
}

/**
 * @notice Full redemption request struct
 * @dev all amounts and rates have 18 decimals
 */
struct FullRedemptionRequest {
    /// @notice address that created the request. Only it can claim
    address wallet;
    /// @notice token the wallet receives
    address paymentToken;
    /// @notice token of the deposit and of the service fee: the mToken or a stable payment token
    address depositAsset;
    /// @notice request status
    FullRedemptionStatus status;
    /// @notice true while an admin has paused the request. A paused request cannot be claimed
    bool paused;
    /// @notice amount of mToken the wallet wants to redeem
    uint256 requested;
    /// @notice amount of mToken that is not claimed yet
    uint256 remaining;
    /// @notice deposit still held for the request, in `depositAsset`
    uint256 depositLeft;
    /// @notice service fee held for the request, in `depositAsset`
    uint256 serviceFee;
    /// @notice payment token fee percent that was fixed at request creation time, 1% = 100
    uint256 feePercent;
    /// @notice mToken/USD rate at request creation time
    uint256 savedRate;
    /// @notice request rate that was set at processing. It never changes
    uint256 processedRate;
    /// @notice request rate used now: amount of `paymentToken` for one mToken, before the fee
    uint256 rate;
    /// @notice amount of `paymentToken` reserved for the request and not paid yet
    uint256 reserved;
    /// @notice timestamp after which the request can be reallocated
    uint256 deadline;
}

/**
 * @notice Full redemption vault init params
 */
struct FullRedemptionVaultInitParams {
    /// @notice address of the access control contract
    address ac;
    /// @notice address of the sanctions list contract
    address sanctionsList;
    /// @notice address of the linked redemption vault
    address redemptionVault;
    /// @notice address that receives service fees
    address serviceFeeReceiver;
    /// @notice deposit as a share of the request value, 1% = 100
    uint256 depositPercentageBps;
    /// @notice service fee in USD (decimals 18)
    uint256 serviceFeeAmount;
    /// @notice time in seconds from processing to the deadline
    uint256 claimPeriod;
    /// @notice largest difference between a safe processing rate and the rate at creation time, 1% = 100
    uint256 rateToleranceBps;
    /// @notice largest difference between an adjusted rate and the rate set at processing, 1% = 100
    uint256 maxRateAdjustmentBps;
}

/**
 * @title IFullRedemptionVault
 * @author RedDuck Software
 */
interface IFullRedemptionVault {
    /**
     * @param requestId request id
     * @param wallet function caller (msg.sender)
     * @param paymentToken address of the payment token
     * @param depositAsset address of the deposit asset
     * @param amountMToken amount of mToken to redeem
     * @param depositAmount deposit amount in `depositAsset` (decimals 18)
     * @param serviceFee service fee amount in `depositAsset` (decimals 18)
     * @param feePercent payment token fee percent of the request
     * @param mTokenRate mToken/USD rate at creation time
     */
    event RequestCreated(
        uint256 indexed requestId,
        address indexed wallet,
        address indexed paymentToken,
        address depositAsset,
        uint256 amountMToken,
        uint256 depositAmount,
        uint256 serviceFee,
        uint256 feePercent,
        uint256 mTokenRate
    );

    /**
     * @param requestId request id
     * @param rate request rate
     * @param reserved amount of payment token reserved for the request (decimals 18)
     * @param deadline timestamp after which the request can be reallocated
     */
    event RequestProcessed(
        uint256 indexed requestId,
        uint256 rate,
        uint256 reserved,
        uint256 deadline
    );

    /**
     * @param requestId request id
     * @param rate new request rate
     * @param reserved new amount of payment token reserved for the request (decimals 18)
     */
    event ExchangeRateAdjusted(
        uint256 indexed requestId,
        uint256 rate,
        uint256 reserved
    );

    /**
     * @param requestId request id
     * @param wallet function caller (msg.sender)
     * @param recipient address that received the payment token
     * @param amountMToken amount of mToken that was burned from `wallet`
     * @param amountTokenOut amount of payment token that was paid (decimals 18)
     */
    event Redeemed(
        uint256 indexed requestId,
        address indexed wallet,
        address indexed recipient,
        uint256 amountMToken,
        uint256 amountTokenOut
    );

    /**
     * @notice the share of the deposit that left the request in a claim.
     * A deposit in a stable token was sent to the recipient.
     * A deposit in mToken was burned: its payment tokens are a part of
     * `amountTokenOut` of the `Redeemed` event
     * @param requestId request id
     * @param amount amount of deposit asset (decimals 18)
     */
    event DepositReturned(uint256 indexed requestId, uint256 amount);

    /**
     * @param requestId request id
     */
    event RequestCompleted(uint256 indexed requestId);

    /**
     * @param requestId request id
     * @param receiver address that received the service fee
     * @param amount amount of deposit asset that was sent (decimals 18)
     */
    event ServiceFeeTransferred(
        uint256 indexed requestId,
        address indexed receiver,
        uint256 amount
    );

    /**
     * @param requestId request id
     * @param receiver address that received the unused liquidity
     * @param amount amount of payment token that was sent (decimals 18)
     */
    event RequestReclaimed(
        uint256 indexed requestId,
        address indexed receiver,
        uint256 amount
    );

    /**
     * @param requestId request id
     * @param receiver address that received the seized deposit
     * @param amount amount of deposit asset that was sent (decimals 18)
     */
    event DepositSeized(
        uint256 indexed requestId,
        address indexed receiver,
        uint256 amount
    );

    /**
     * @param requestId request id
     * @param refundAddress address that received the deposit and the service fee
     * @param depositAmount amount of deposit asset that was returned (decimals 18)
     * @param serviceFee service fee amount in deposit asset that was returned (decimals 18)
     */
    event RequestCancelled(
        uint256 indexed requestId,
        address indexed refundAddress,
        uint256 depositAmount,
        uint256 serviceFee
    );

    /**
     * @param requestId request id
     */
    event RequestPaused(uint256 indexed requestId);

    /**
     * @param requestId request id
     */
    event RequestUnpaused(uint256 indexed requestId);

    /**
     * @param token token that was withdrawn
     * @param withdrawTo address to which tokens were withdrawn
     * @param amount `token` transfer amount
     */
    event WithdrawToken(
        address indexed token,
        address indexed withdrawTo,
        uint256 amount
    );

    /**
     * @notice error when the token is not a stable payment token of the linked vault
     * @param token token address
     */
    error PaymentTokenNotStable(address token);

    /**
     * @notice error when the deposit and the service fee are greater than the maximum the wallet gave
     * @param maxPayAmount maximum amount the wallet agreed to pay
     * @param payAmount deposit plus service fee
     */
    error MaxPayAmountExceeded(uint256 maxPayAmount, uint256 payAmount);

    /**
     * @notice error when the request status does not allow the operation
     * @param requestId request id
     * @param status actual request status
     */
    error InvalidRequestStatus(uint256 requestId, FullRedemptionStatus status);

    /**
     * @notice error when the caller is not the wallet of the request
     * @param requestId request id
     * @param caller function caller
     */
    error NotRequestWallet(uint256 requestId, address caller);

    /**
     * @notice error when the claim is greater than the remaining amount of the request
     * @param amount amount of mToken to claim
     * @param remaining amount of mToken that is not claimed yet
     */
    error AmountExceedsRemaining(uint256 amount, uint256 remaining);

    /**
     * @notice error when the vault does not have enough free liquidity
     * @param token token address
     * @param freeLiquidity free liquidity of the token (decimals 18)
     * @param required required amount (decimals 18)
     */
    error InsufficientFreeLiquidity(
        address token,
        uint256 freeLiquidity,
        uint256 required
    );

    /**
     * @notice error when the deadline of the request has not passed
     * and the request is not paused
     * @param requestId request id
     * @param deadline deadline of the request
     */
    error DeadlineNotPassed(uint256 requestId, uint256 deadline);

    /**
     * @notice error when the request is paused
     * @param requestId request id
     */
    error RequestIsPaused(uint256 requestId);

    /**
     * @notice error when the request is not paused
     * @param requestId request id
     */
    error RequestNotPaused(uint256 requestId);

    /**
     * @notice creates a full redemption request.
     * Transfers the deposit and the service fee from the msg.sender to the vault
     * @param paymentToken stable payment token of the linked vault to receive
     * @param depositAsset token to pay the deposit and the service fee in:
     * the mToken or a stable payment token of the linked vault
     * @param amountMToken amount of mToken to redeem (decimals 18)
     * @param maxPayAmount maximum of deposit plus service fee to pay,
     * in `depositAsset` (decimals 18)
     * @return requestId request id
     */
    function createRequest(
        address paymentToken,
        address depositAsset,
        uint256 amountMToken,
        uint256 maxPayAmount
    ) external returns (uint256 requestId);

    /**
     * @notice processes requests at the mToken rate of their creation time:
     * sets the request rate and reserves free liquidity for each request.
     * Reverts if one of the requests cannot be processed.
     * can be called only from permissioned actor.
     * @param requestIds request ids
     */
    function safeProcessAtSavedRateBulk(uint256[] calldata requestIds) external;

    /**
     * @notice processes requests at the current mToken rate of the data feed.
     * The rate must be within the tolerance of the rate at creation time.
     * Reverts if one of the requests cannot be processed.
     * can be called only from permissioned actor.
     * @param requestIds request ids
     */
    function safeProcessAtCurrentRateBulk(uint256[] calldata requestIds)
        external;

    /**
     * @notice processes requests at the given rates.
     * Each rate must be within the tolerance of the rate at creation time.
     * Reverts if one of the requests cannot be processed.
     * can be called only from permissioned actor.
     * @param requestIds request ids
     * @param rates mToken/USD rates, one for each request (decimals 18)
     */
    function safeProcessAtCustomRateBulk(
        uint256[] calldata requestIds,
        uint256[] calldata rates
    ) external;

    /**
     * @notice sets the request rate and reserves free liquidity for the request.
     * Does not check the rate against the rate at creation time.
     * can be called only from permissioned actor.
     * @param requestId request id
     * @param rate mToken/USD rate (decimals 18)
     */
    function processAtCustomRate(uint256 requestId, uint256 rate) external;

    /**
     * @notice changes the rate of a processed request for the amount
     * that is not claimed yet. Reserves more free liquidity for a higher rate
     * and frees liquidity for a lower rate.
     * can be called only from permissioned actor.
     * @param requestId request id
     * @param newRate mToken/USD rate (decimals 18)
     */
    function adjustRate(uint256 requestId, uint256 newRate) external;

    /**
     * @notice burns mToken from the msg.sender and pays the same share
     * of the reserved liquidity and of the deposit of the request.
     * Can be called only by the wallet of the request
     * @param requestId request id
     * @param amountMToken amount of mToken to claim (decimals 18)
     * @param minReceiveAmount minimum amount of payment token to receive (decimals 18)
     * @return amount of payment token that was paid in original decimals
     */
    function claim(
        uint256 requestId,
        uint256 amountMToken,
        uint256 minReceiveAmount
    ) external returns (uint256);

    /**
     * @notice does the same as claim, but pays to a custom recipient
     * @param requestId request id
     * @param amountMToken amount of mToken to claim (decimals 18)
     * @param minReceiveAmount minimum amount of payment token to receive (decimals 18)
     * @param recipient address that receives the payment token and the deposit share
     * @return amount of payment token that was paid in original decimals
     */
    function claim(
        uint256 requestId,
        uint256 amountMToken,
        uint256 minReceiveAmount,
        address recipient
    ) external returns (uint256);

    /**
     * @notice closes a processed request after its deadline, or before it
     * if the request is paused. Sends the unused liquidity and the remaining
     * deposit to the tokens receiver of the linked vault and the service fee
     * to the service fee receiver.
     * can be called only from permissioned actor.
     * @param requestId request id
     */
    function reallocate(uint256 requestId) external;

    /**
     * @notice closes a request that is not processed. Sends the deposit
     * and the service fee to `refundAddress`.
     * can be called only from permissioned actor.
     * @param requestId request id
     * @param refundAddress address that receives the deposit and the service fee
     */
    function cancelRequest(uint256 requestId, address refundAddress) external;

    /**
     * @notice pauses a request that is not final. A paused request cannot be claimed.
     * can be called only from permissioned actor.
     * The timelock delay is the pause delay of the pause manager
     * @param requestId request id
     */
    function pauseRequest(uint256 requestId) external;

    /**
     * @notice unpauses a request.
     * can be called only from permissioned actor.
     * The timelock delay is the unpause delay of the pause manager
     * @param requestId request id
     */
    function unpauseRequest(uint256 requestId) external;

    /**
     * @notice sends free liquidity to the tokens receiver of the linked vault.
     * can be called only from permissioned actor.
     * @param token token address
     * @param amount token amount, in the decimals of the token
     */
    function withdrawToken(address token, uint256 amount) external;

    /**
     * @notice request data
     * @dev a request that does not exist has zero `wallet`
     * @param requestId request id
     * @return request data
     */
    function getRequest(uint256 requestId)
        external
        view
        returns (FullRedemptionRequest memory);

    /**
     * @notice amount of token in the vault that does not belong to a request
     * @param token token address
     * @return free liquidity of the token (decimals 18)
     */
    function freeLiquidity(address token) external view returns (uint256);
}
