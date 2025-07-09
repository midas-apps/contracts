// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IManageableVault.sol";

/**
 * @notice Redeem request scruct
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

struct FiatRedeptionInitParams {
    uint256 fiatAdditionalFee;
    uint256 fiatFlatFee;
    uint256 minFiatRedeemAmount;
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
     * @param feeAmount fee amount in mToken
     * @param amountTokenOut amount of tokenOut
     */
    event RedeemInstant(
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
     * @param feeAmount fee amount in mToken
     * @param amountTokenOut amount of tokenOut
     */
    event RedeemInstantWithCustomRecipient(
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
     * @param feeAmount fee amount in mToken
     */
    event RedeemRequest(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        uint256 amountMTokenIn,
        uint256 feeAmount
    );

    /**
     * @param requestId request id
     * @param user function caller (msg.sender)
     * @param tokenOut address of tokenOut
     * @param recipient address that receives tokens
     * @param amountMTokenIn amount of mToken
     * @param feeAmount fee amount in mToken
     */
    event RedeemRequestWithCustomRecipient(
        uint256 indexed requestId,
        address indexed user,
        address indexed tokenOut,
        address recipient,
        uint256 amountMTokenIn,
        uint256 feeAmount
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
     * @notice redeem mToken to tokenOut if daily limit and allowance not exceeded
     * Burns mTBILL from the user.
     * Transfers fee in mToken to feeReceiver
     * Transfers tokenOut to user.
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mTBILL to redeem (decimals 18)
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount
    ) external;

    /**
     * @notice Does the same as `redeemInstant` but allows specifying a custom tokensReceiver address.
     * @param tokenOut stable coin token address to redeem to
     * @param amountMTokenIn amount of mTBILL to redeem (decimals 18)
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
     * @notice Does the same as `redeemRequest` but allows specifying a custom tokensReceiver address.
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
}
