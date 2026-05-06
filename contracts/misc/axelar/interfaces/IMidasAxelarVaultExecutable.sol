// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IDepositVault} from "../../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../../interfaces/IRedemptionVault.sol";

/**
 * @title IMidasAxelarVaultExecutable
 * @notice Interface for the MidasAxelarVaultExecutable contract
 * @author RedDuck Software
 */
interface IMidasAxelarVaultExecutable {
    /**
     * @notice event emitted when a operation is successful
     * @param commandId the commandId of the send operation
     */
    event Sent(bytes32 indexed commandId);

    /**
     * @notice event emitted when a refund operation is successful
     * @param commandId the commandId of the refund operation
     */
    event Refunded(bytes32 indexed commandId, bytes _error);

    /**
     * @notice event emitted when a deposit operation is successful
     * @param sender the sender of the deposit operation
     * @param recipient the recipient of the deposit operation
     * @param destinationChain the destination chain of the deposit operation
     * @param paymentTokenAmount the amount of payment tokens deposited
     * @param mTokenAmount the amount of m tokens deposited
     */
    event Deposited(
        bytes sender,
        bytes recipient,
        string destinationChain,
        uint256 paymentTokenAmount,
        uint256 mTokenAmount
    );

    /**
     * @notice event emitted when a redemption operation is successful
     * @param sender the sender of the redemption operation
     * @param recipient the recipient of the redemption operation
     * @param destinationChain the destination chain of the redemption operation
     * @param mTokenAmount the amount of m tokens redeemed
     * @param paymentTokenAmount the amount of payment tokens redeemed
     */
    event Redeemed(
        bytes sender,
        bytes recipient,
        string destinationChain,
        uint256 mTokenAmount,
        uint256 paymentTokenAmount
    );

    /**
     * @notice error emitted when the caller is not the self
     * @param caller the caller of the function
     */
    error OnlySelf(address caller);

    /**
     * @notice error emitted when the tokenId is not a valid executable tokenId
     * @param tokenId the tokenId of the ITS token
     */
    error OnlyValidExecutableTokenId(bytes32 tokenId);

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
     * @notice getter for the paymentToken ITS id
     * @return the paymentToken ITS id
     */
    function paymentTokenId() external view returns (bytes32);

    /**
     * @notice getter for the paymentToken ERC20
     * @return the paymentToken ERC20
     */
    function paymentTokenErc20() external view returns (address);

    /**
     * @notice getter for the mToken ITS id
     * @return the mToken ITS id
     */
    function mTokenId() external view returns (bytes32);

    /**
     * @notice getter for the mToken ERC20
     * @return the mToken ERC20
     */
    function mTokenErc20() external view returns (address);

    /**
     * @notice deposits and sends the paymentToken to the destination chain
     * @param _paymentTokenAmount the amount of payment tokens to deposit
     * @param _data encoded data for the deposit.
     * Expected data: abi.encode(bytes receiver,uint256 minReceiveAmount,bytes32 referrerId,string receiverChainName);
     */
    function depositAndSend(uint256 _paymentTokenAmount, bytes calldata _data)
        external
        payable;

    /**
     * @notice redeems and sends the mToken to the destination chain
     * @param _mTokenAmount the amount of m tokens to redeem
     * @param _data encoded data for the redemption
     * Expected data: abi.encode(bytes receiver,uint256 minReceiveAmount,string receiverChainName);
     */
    function redeemAndSend(uint256 _mTokenAmount, bytes calldata _data)
        external
        payable;
}
