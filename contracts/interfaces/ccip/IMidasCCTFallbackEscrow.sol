// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {IMidasCCTFailedMessageFallback} from "./IMidasCCTFailedMessageFallback.sol";

/**
 * @title IMidasCCTFallbackEscrow
 * @author RedDuck Software
 */
interface IMidasCCTFallbackEscrow is IMidasCCTFailedMessageFallback {
    /**
     * @notice The status of a failed message
     */
    enum MessageStatus {
        Pending,
        Claimed,
        Recovered,
        Closed
    }

    struct FailedMessage {
        address originalRecipient;
        uint64 originalSourceChainSelector;
        uint256 tokenAmount;
        MessageStatus status;
    }

    struct OrphanedMessage {
        address originalRecipient;
        uint256 tokenAmount;
        uint64 originalSourceChainSelector;
    }

    /**
     * @param _messageId the id of the failed message
     * @param _recipient the recipient of the failed message
     */
    event Claim(bytes32 _messageId, address _recipient);

    /**
     * @param _messageId the id of the failed message
     * @param _ccipMessageId the id of the CCIP message
     * @param _recipient the recipient of the failed message in bytes
     * @param _remoteChainSelector the remote chain selector
     */
    event ClaimToRemote(
        bytes32 _messageId,
        bytes32 _ccipMessageId,
        bytes _recipient,
        uint64 _remoteChainSelector
    );

    /**
     * @param _messageIds the ids of the closed messages
     */
    event CloseBulk(bytes32[] _messageIds);

    /**
     * @param _messageIds the ids of the recovered messages
     */
    event RecoverBulk(bytes32[] _messageIds);

    /**
     * @param _messages the messages to register
     */
    event RegisterOrphanedBulk(OrphanedMessage[] _messages);

    /**
     * @param _defaultRecipient the default recipient
     */
    event SetDefaultRecipient(address _defaultRecipient);

    /**
     * @param _messageId the id of the closed message
     */
    event OnFailedMessage(bytes32 _messageId);

    /**
     * @notice Error thrown when the sender is invalid
     */
    error NotTokenPool();

    /**
     * @notice Error thrown when the caller is not the contract admin
     */
    error NotContractAdmin();

    /**
     * @notice Error thrown when the default recipient is invalid
     */
    error ZeroAddress();

    /**
     * @notice Error thrown when the failed message is not found
     */
    error FailedMessageNotFound(bytes32 _messageId);

    /**
     * @notice Error thrown when the sender is invalid
     */
    error InvalidSender(address _expectedSender);

    /**
     * @notice Sets the default recipient
     * @param _defaultRecipient the default recipient to set
     */
    function setDefaultRecipient(address _defaultRecipient) external;

    /**
     * @notice Claims a failed message
     * @dev should be called by the original recipient of the failed message
     * @param _messageId the id of the failed message
     * @param _recipient the recipient of the failed message
     */
    function claim(bytes32 _messageId, address _recipient) external;

    /**
     * @notice Claims a failed message to a remote chain
     * @dev should be called by the original recipient of the failed message
     * sender should provide exactly IRouterClient.getFee(...) value for a tx
     * otherwise the tx will either revert or sender will lose unused fees
     * @param _messageId the id of the failed message
     * @param _recipient the recipient of the failed message in bytes
     * @param _remoteChainSelector the remote chain selector
     */
    function claimToRemote(
        bytes32 _messageId,
        bytes memory _recipient,
        uint64 _remoteChainSelector
    ) external payable;

    /**
     * @notice Recovers a bulk of failed messages
     * @dev should be called by the contract admin
     * @param _messageIds the ids of the failed messages to recover
     */
    function recoverBulk(bytes32[] calldata _messageIds) external;

    /**
     * @notice Closes a bulk of failed messages and transfers the tokens to the default recipient
     * @dev should be called by the contract admin
     * @param _messageIds the ids of the failed messages to close
     */
    function closeBulk(bytes32[] calldata _messageIds) external;

    /**
     * @notice Registers a bulk of orphaned messages
     * @dev should be called by the contract admin
     * tokens should be minted to the escrow contract in a separate transaction
     * @param _messages the messages to register
     */
    function registerOrphanedBulk(OrphanedMessage[] calldata _messages)
        external;

    /**
     * @notice Gets the ids of pending failed messages
     * @return the ids of the pending failed messages
     */
    function getFailedMessageIds() external view returns (bytes32[] memory);
}
