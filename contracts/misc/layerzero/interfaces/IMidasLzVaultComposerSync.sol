// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IOAppComposer} from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppComposer.sol";
import {SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

import {IDepositVault} from "../../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../../interfaces/IRedemptionVault.sol";

/**
 * @title IMidasLzVaultComposerSync
 * @notice Interface for the MidasLzVaultComposerSync contract
 * @author RedDuck Software
 */
interface IMidasLzVaultComposerSync is IOAppComposer {
    /**
     * @notice event emitted when a send operation is successful
     * @param guid the guid of the send operation
     */
    event Sent(bytes32 indexed guid);

    /**
     * @notice event emitted when a refund operation is successful
     * @param guid the guid of the refund operation
     */
    event Refunded(bytes32 indexed guid);

    /**
     * @notice event emitted when a deposit operation is successful
     * @param sender the sender of the deposit operation
     * @param recipient the recipient of the deposit operation
     * @param dstEid the destination eid of the deposit operation
     * @param paymentTokenAmount the amount of payment tokens deposited
     * @param mTokenAmount the amount of m tokens deposited
     */
    event Deposited(
        bytes32 sender,
        bytes32 recipient,
        uint32 dstEid,
        uint256 paymentTokenAmount,
        uint256 mTokenAmount
    );

    /**
     * @notice event emitted when a redemption operation is successful
     * @param sender the sender of the redemption operation
     * @param recipient the recipient of the redemption operation
     * @param dstEid the destination eid of the redemption operation
     * @param mTokenAmount the amount of m tokens redeemed
     * @param paymentTokenAmount the amount of payment tokens redeemed
     */
    event Redeemed(
        bytes32 sender,
        bytes32 recipient,
        uint32 dstEid,
        uint256 mTokenAmount,
        uint256 paymentTokenAmount
    );

    /**
     * @notice error emitted when the caller is not the endpoint
     * @param caller the caller of the function
     */
    error OnlyEndpoint(address caller);

    /**
     * @notice error emitted when the caller is not the self
     * @param caller the caller of the function
     */
    error OnlySelf(address caller);

    /**
     * @notice error emitted when the caller is not a valid compose caller
     * @param caller the caller of the function
     */
    error OnlyValidComposeCaller(address caller);

    /**
     * @notice error emitted when the msg.value is insufficient
     * @param expectedMsgValue the expected msg.value
     * @param actualMsgValue the actual msg.value
     */
    error InsufficientMsgValue(
        uint256 expectedMsgValue,
        uint256 actualMsgValue
    );

    /**
     * @notice error emitted when msg.value expected to be 0 but is not
     */
    error NoMsgValueExpected();

    /**
     * @notice getter for the deposit vault
     * @return the deposit vault
     */
    function depositVault() external view returns (IDepositVault);

    /**
     * @notice getter for the redemption vault
     * @return the redemption vault
     */
    function redemptionVault() external view returns (IRedemptionVault);

    /**
     * @notice getter for the paymentToken OFT
     * @return the paymentToken OFT
     */
    function paymentTokenOft() external view returns (address);

    /**
     * @notice getter for the paymentToken ERC20
     * @return the paymentToken ERC20
     */
    function paymentTokenErc20() external view returns (address);

    /**
     * @notice getter for the mToken OFT
     * @return the mToken OFT
     */
    function mTokenOft() external view returns (address);

    /**
     * @notice getter for the mToken ERC20
     * @return the mToken ERC20
     */
    function mTokenErc20() external view returns (address);

    /**
     * @notice getter for the LayerZero endpoint
     * @return the LayerZero endpoint
     */
    function lzEndpoint() external view returns (address);

    /**
     * @notice getter for the current chain EID
     * @return the current chain EID
     */
    function thisChaindEid() external view returns (uint32);

    /**
     * @notice Deposits payment token from the caller into the vault and sends them to the recipient
     * @param paymentTokenAmount The number of ERC20 tokens to deposit and send
     * @param extraOptions Extra options for the deposit operation.
     * Expected extraOptions: abi.encode(bytes32 referrerId) or 0x
     * @param sendParam Parameters on how to send the mTokens to the recipient
     * @param refundAddress Address to receive excess `msg.value`
     */
    function depositAndSend(
        uint256 paymentTokenAmount,
        bytes memory extraOptions,
        SendParam memory sendParam,
        address refundAddress
    ) external payable;

    /**
     * @notice Redeems vault mTokens and sends the resulting payment tokens to the user
     * @param mTokenAmount The number of vault mTokens to redeem
     * @param extraOptions Extra options for the redeem operation.
     * Expected extraOptions: 0x
     * @param sendParam Parameter that defines how to send the payment tokens to the recipient
     * @param refundAddress Address to receive excess payment of the LZ fees
     */
    function redeemAndSend(
        uint256 mTokenAmount,
        bytes memory extraOptions,
        SendParam memory sendParam,
        address refundAddress
    ) external payable;

    /// ========================== Receive =====================================
    receive() external payable;
}
