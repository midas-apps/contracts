// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @notice Mint request scruct
 * @param sender user address who create
 * @param tokenIn tokenIn address
 * @param status request status
 * @param depositedUsdAmount amout USD, tokenIn -> USD
 * @param usdAmountWithoutFees amout USD, tokenIn - fees -> USD
 * @param tokenOutRate rate of mToken at request creation time
 */
struct Request {
    address sender;
    address tokenIn;
    RequestStatus status;
    uint256 depositedUsdAmount;
    uint256 usdAmountWithoutFees;
    uint256 tokenOutRate;
}

/**
 * @title IDepositVault
 * @author RedDuck Software
 */
interface IDepositVault is IManageableVault {
    /**
     * @param caller function caller (msg.sender)
     * @param newValue new min amount to deposit value
     */
    event SetMinMTokenAmountForFirstDeposit(
        address indexed caller,
        uint256 newValue
    );

    /**
     * @param user function caller (msg.sender)
     * @param tokenIn address of tokenIn
     * @param amountUsd amount of tokenIn converted to USD
     * @param amountToken amount of tokenIn
     * @param fee fee amount in tokenIn
     * @param minted amount of minted mTokens
     * @param referrerId referrer id
     */
    event DepositInstant(
        address indexed user,
        address indexed tokenIn,
        uint256 amountUsd,
        uint256 amountToken,
        uint256 fee,
        uint256 minted,
        bytes32 referrerId
    );

    /**
     * @param user function caller (msg.sender)
     * @param tokenIn address of tokenIn
     * @param recipient address that receives the mTokens
     * @param amountUsd amount of tokenIn converted to USD
     * @param amountToken amount of tokenIn
     * @param fee fee amount in tokenIn
     * @param minted amount of minted mTokens
     * @param referrerId referrer id
     */
    event DepositInstantWithCustomRecipient(
        address indexed user,
        address indexed tokenIn,
        address recipient,
        uint256 amountUsd,
        uint256 amountToken,
        uint256 fee,
        uint256 minted,
        bytes32 referrerId
    );

    /**
     * @param requestId mint request id
     * @param user function caller (msg.sender)
     * @param tokenIn address of tokenIn
     * @param amountToken amount of tokenIn
     * @param amountUsd amount of tokenIn converted to USD
     * @param fee fee amount in tokenIn
     * @param tokenOutRate mToken rate
     * @param referrerId referrer id
     */
    event DepositRequest(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenIn,
        uint256 amountToken,
        uint256 amountUsd,
        uint256 fee,
        uint256 tokenOutRate,
        bytes32 referrerId
    );

    /**
     * @param requestId mint request id
     * @param user function caller (msg.sender)
     * @param recipient address that receives the mTokens
     * @param tokenIn address of tokenIn
     * @param amountToken amount of tokenIn
     * @param amountUsd amount of tokenIn converted to USD
     * @param fee fee amount in tokenIn
     * @param tokenOutRate mToken rate
     * @param referrerId referrer id
     */
    event DepositRequestWithCustomRecipient(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenIn,
        address recipient,
        uint256 amountToken,
        uint256 amountUsd,
        uint256 fee,
        uint256 tokenOutRate,
        bytes32 referrerId
    );

    /**
     * @param requestId mint request id
     * @param newOutRate mToken rate inputted by admin
     */
    event ApproveRequest(uint256 indexed requestId, uint256 newOutRate);

    /**
     * @param requestId mint request id
     * @param newOutRate mToken rate inputted by admin
     */
    event SafeApproveRequest(uint256 indexed requestId, uint256 newOutRate);

    /**
     * @param requestId mint request id
     * @param user address of user
     */
    event RejectRequest(uint256 indexed requestId, address indexed user);

    /**
     * @param user address that was freed from min deposit check
     */
    event FreeFromMinDeposit(address indexed user);

    /**
     * @notice depositing proccess with auto mint if
     * account fit daily limit and token allowance.
     * Transfers token from the user.
     * Transfers fee in tokenIn to feeReceiver.
     * Mints mToken to user.
     * @param tokenIn address of tokenIn
     * @param amountToken amount of `tokenIn` that will be taken from user (decimals 18)
     * @param minReceiveAmount minimum expected amount of mToken to receive (decimals 18)
     * @param referrerId referrer id
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId
    ) external;

    /**
     * @notice Does the same as original `depositInstant` but allows specifying a custom tokensReceiver address.
     * @param tokenIn address of tokenIn
     * @param amountToken amount of `tokenIn` that will be taken from user (decimals 18)
     * @param minReceiveAmount minimum expected amount of mToken to receive (decimals 18)
     * @param referrerId referrer id
     * @param tokensReceiver address to receive the tokens (instead of msg.sender)
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId,
        address tokensReceiver
    ) external;

    /**
     * @notice depositing proccess with mint request creating if
     * account fit token allowance.
     * Transfers token from the user.
     * Transfers fee in tokenIn to feeReceiver.
     * Creates mint request.
     * @param tokenIn address of tokenIn
     * @param amountToken amount of `tokenIn` that will be taken from user (decimals 18)
     * @param referrerId referrer id
     * @return request id
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId
    ) external returns (uint256);

    /**
     * @notice Does the same as original `depositRequest` but allows specifying a custom tokensReceiver address.
     * @param tokenIn address of tokenIn
     * @param amountToken amount of `tokenIn` that will be taken from user (decimals 18)
     * @param referrerId referrer id
     * @param recipient address that receives the mTokens
     * @return request id
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId,
        address recipient
    ) external returns (uint256);

    /**
     * @notice approving request if inputted token rate fit price diviation percent
     * Mints mToken to user.
     * Sets request flag to Processed.
     * @param requestId request id
     * @param newOutRate mToken rate inputted by vault admin
     */
    function safeApproveRequest(uint256 requestId, uint256 newOutRate) external;

    /**
     * @notice approving request without price diviation check
     * Mints mToken to user.
     * Sets request flag to Processed.
     * @param requestId request id
     * @param newOutRate mToken rate inputted by vault admin
     */
    function approveRequest(uint256 requestId, uint256 newOutRate) external;

    /**
     * @notice rejecting request
     * Sets request flag to Canceled.
     * @param requestId request id
     */
    function rejectRequest(uint256 requestId) external;

    /**
     * @notice sets new minimal amount to deposit in EUR.
     * can be called only from vault`s admin
     * @param newValue new min. deposit value
     */
    function setMinMTokenAmountForFirstDeposit(uint256 newValue) external;
}
