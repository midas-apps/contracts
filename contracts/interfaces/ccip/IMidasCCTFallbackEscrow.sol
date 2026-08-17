// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {IMidasCCTFallbackReceiver} from "./IMidasCCTFallbackReceiver.sol";

/**
 * @title IMidasCCTFallbackEscrow
 * @author RedDuck Software
 * @notice User and administration API for funded CCIP recoveries.
 * @dev A recovery exists only after the configured pool has minted its full
 * amount to the escrow and registered it atomically through
 * `onFallbackMinted`. Every state other than `Pending` and `None` is terminal.
 * Proxy initialization and public storage getters remain part of the concrete
 * escrow ABI and are intentionally excluded from this ERC-165 capability.
 */
interface IMidasCCTFallbackEscrow is IMidasCCTFallbackReceiver {
    /**
     * @notice Lifecycle state of a funded recovery record.
     * @dev `None` is the zero value returned for an unknown recovery ID.
     */
    enum RecoveryStatus {
        /// @dev No recovery is registered for the queried ID.
        None,
        /// @dev Funds are reserved in escrow and may be resolved once.
        Pending,
        /// @dev The original recipient completed a local claim.
        Claimed,
        /// @dev An escrow admin completed a local recovery.
        AdminRecovered,
        /// @dev A one-hop CCIP return to the original sender was dispatched.
        ReturnDispatched,
        /// @dev An escrow admin transferred the funds to the default recipient.
        Confiscated
    }

    /**
     * @notice Complete state retained for one funded recovery.
     * @param originalSender Direct Router caller on the source chain.
     * @param originalRecipient Requested token recipient on the current chain.
     * @param originalSourceChainSelector Chainlink selector of the source chain.
     * @param amount Local-denominated amount reserved for this recovery.
     * @param status Current recovery lifecycle state.
     * @param returnable Whether a one-hop return to the recorded source is
     * permitted.
     * @param outboundCcipMessageId CCIP message ID produced by a successful
     * source return, or zero if no return was dispatched.
     */
    struct RecoveryRecord {
        address originalSender;
        address originalRecipient;
        uint64 originalSourceChainSelector;
        uint256 amount;
        RecoveryStatus status;
        bool returnable;
        bytes32 outboundCcipMessageId;
    }

    /**
     * @notice One explicit local destination selected by an escrow admin.
     * @param recoveryId Recovery record to resolve.
     * @param recipient Local address that should receive the reserved tokens.
     */
    struct LocalRecovery {
        bytes32 recoveryId;
        address recipient;
    }

    /**
     * @notice Emitted when the pool creates a funded recovery.
     * @param recoveryId Locally generated recovery identifier.
     * @param originalSender Direct Router caller on the source chain.
     * @param originalRecipient Requested destination token recipient.
     * @param originalSourceChainSelector Chainlink selector of the source chain.
     * @param amount Local-denominated amount reserved in escrow.
     * @param returnable Whether this record permits a one-hop source return.
     */
    event RecoveryRegistered(
        bytes32 indexed recoveryId,
        address indexed originalSender,
        address indexed originalRecipient,
        uint64 originalSourceChainSelector,
        uint256 amount,
        bool returnable
    );

    /**
     * @notice Emitted when the original recipient completes a local claim.
     * @param recoveryId Resolved recovery identifier.
     * @param originalRecipient Recorded destination recipient that authorized
     * the claim.
     * @param recipient Local address that received the tokens.
     * @param amount Amount transferred from escrow.
     */
    event RecoveryClaimed(
        bytes32 indexed recoveryId,
        address indexed originalRecipient,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @notice Emitted for each record resolved through admin local recovery.
     * @param recoveryId Resolved recovery identifier.
     * @param admin Escrow admin that submitted the batch.
     * @param recipient Local address that received the tokens.
     * @param originalRecipient Requested recipient recorded by CCIP.
     * @param amount Amount transferred from escrow.
     */
    event RecoveryAdminRecovered(
        bytes32 indexed recoveryId,
        address indexed admin,
        address indexed recipient,
        address originalRecipient,
        uint256 amount
    );

    /**
     * @notice Emitted when a one-hop return to the source chain is dispatched.
     * @param recoveryId Resolved recovery identifier.
     * @param outboundCcipMessageId Message ID returned by the CCIP Router.
     * @param caller Original recipient or escrow admin that dispatched the return.
     * @param originalSourceChainSelector Destination selector of the return.
     * @param originalSender Fixed token recipient of the return.
     * @param amount Amount transferred through CCIP.
     */
    event RecoveryReturnDispatched(
        bytes32 indexed recoveryId,
        bytes32 indexed outboundCcipMessageId,
        address indexed caller,
        uint64 originalSourceChainSelector,
        address originalSender,
        uint256 amount
    );

    /**
     * @notice Emitted for each record confiscated to the default recipient.
     * @param recoveryId Resolved recovery identifier.
     * @param admin Escrow admin that submitted the batch.
     * @param defaultRecipient Address selected by current escrow configuration.
     * @param amount Amount included in the confiscation transfer.
     */
    event RecoveryConfiscated(
        bytes32 indexed recoveryId,
        address indexed admin,
        address indexed defaultRecipient,
        uint256 amount
    );

    /**
     * @notice Emitted when the confiscation recipient changes.
     * @param oldDefaultRecipient Previously configured recipient.
     * @param newDefaultRecipient Newly configured recipient.
     */
    event DefaultRecipientSet(
        address indexed oldDefaultRecipient,
        address indexed newDefaultRecipient
    );

    /**
     * @notice Emitted when return-message provenance is enabled or disabled for
     * a remote escrow.
     * @param sourceChainSelector Chainlink selector associated with the peer.
     * @param peerEscrow Remote escrow address as represented by CCIP.
     * @param allowed Whether the peer marks newly registered records as
     * non-returnable.
     */
    event PeerEscrowSet(
        uint64 indexed sourceChainSelector,
        address indexed peerEscrow,
        bool allowed
    );

    /**
     * @notice Reverts when a caller other than the configured pool attempts to
     * register a recovery.
     * @param caller Unauthorized caller.
     */
    error NotTokenPool(address caller);

    /**
     * @notice Reverts when an account lacks the shared escrow admin role.
     * @param caller Unauthorized caller.
     */
    error NotEscrowAdmin(address caller);

    /**
     * @notice Reverts when initialization cannot validate the supplied pool or
     * its token dependency.
     * @param pool Rejected pool address.
     */
    error InvalidPool(address pool);

    /**
     * @notice Reverts when the escrow and token would use different Midas
     * access-control contracts.
     * @param suppliedAccessControl Access-control address supplied to escrow
     * initialization.
     * @param tokenAccessControl Access-control address reported by the token.
     */
    error AccessControlMismatch(
        address suppliedAccessControl,
        address tokenAccessControl
    );

    /**
     * @notice Reverts when a required address is zero.
     */
    error ZeroAddress();

    /**
     * @notice Reverts when a local recipient is zero, this escrow, or its pool.
     * @param recipient Rejected local recipient.
     */
    error InvalidLocalRecipient(address recipient);

    /**
     * @notice Reverts when an admin resolution batch is empty.
     */
    error EmptyBatch();

    /**
     * @notice Reverts when a record is missing or already terminal.
     * @param recoveryId Requested recovery identifier.
     * @param currentStatus Current status, including `None` for an unknown ID.
     */
    error RecoveryNotPending(bytes32 recoveryId, RecoveryStatus currentStatus);

    /**
     * @notice Reverts when the caller cannot resolve the selected record.
     * @param recoveryId Requested recovery identifier.
     * @param caller Unauthorized caller.
     */
    error UnauthorizedRecoveryCaller(bytes32 recoveryId, address caller);

    /**
     * @notice Reverts when a record originated from a configured peer escrow
     * and therefore cannot be returned again.
     * @param recoveryId Non-returnable recovery identifier.
     */
    error RecoveryNotReturnable(bytes32 recoveryId);

    /**
     * @notice Reverts when the pool callback supplies a zero original sender.
     * @param originalSender Rejected source sender.
     */
    error InvalidOriginalSender(address originalSender);

    /**
     * @notice Reverts when the pool callback supplies a zero recovery amount.
     * @param amount Rejected amount.
     */
    error InvalidAmount(uint256 amount);

    /**
     * @notice Reverts when a registration is not backed by sufficient tokens.
     * @param tokenBalance Current token balance of the escrow.
     * @param requiredBalance Balance required after adding the new liability.
     */
    error InsufficientEscrowFunding(
        uint256 tokenBalance,
        uint256 requiredBalance
    );

    /**
     * @notice Reverts when existing pending liabilities exceed the escrow's
     * current token balance.
     * @param tokenBalance Current token balance of the escrow.
     * @param totalReserved Amount reserved by all pending records.
     */
    error EscrowInsolvent(uint256 tokenBalance, uint256 totalReserved);

    /**
     * @notice Reverts when a source return receives less native currency than
     * the Router's current quote.
     * @param supplied Native amount supplied by the caller.
     * @param required Current native Router fee.
     */
    error InsufficientCcipFee(uint256 supplied, uint256 required);

    /**
     * @notice Reverts when the bound pool reports a zero or non-contract Router.
     * @param router Rejected Router address.
     */
    error InvalidRouter(address router);

    /**
     * @notice Reverts when excess native currency cannot be returned to the caller.
     * @param recipient Caller that should receive the refund.
     * @param amount Native refund amount.
     */
    error NativeRefundFailed(address recipient, uint256 amount);

    /**
     * @notice Lets the recorded original recipient deliver one pending recovery
     * to an explicit local address.
     * @dev The caller must not be blacklisted. The token remains responsible for
     * destination transfer policy; a failed transfer leaves the record pending.
     * @param recoveryId Pending recovery to claim.
     * @param recipient Local token recipient selected by the caller.
     */
    function claim(bytes32 recoveryId, address recipient) external;

    /**
     * @notice Resolves pending recoveries to explicit local recipients.
     * @dev Restricted to escrow admins. The nonempty batch is atomic.
     * @param recoveries Recovery IDs and their corresponding local recipients.
     */
    function adminRecoverBulk(LocalRecovery[] calldata recoveries) external;

    /**
     * @notice Resolves pending recoveries to the current default recipient.
     * @dev Restricted to escrow admins. The nonempty batch is atomic and emits
     * one `RecoveryConfiscated` event per record.
     * @param recoveryIds Recovery identifiers to confiscate.
     */
    function confiscateBulk(bytes32[] calldata recoveryIds) external;

    /**
     * @notice Quotes the native CCIP fee for returning one pending recovery to
     * its recorded source chain and original sender.
     * @param recoveryId Pending returnable recovery to quote.
     * @return Current native Router fee for the fixed return message.
     */
    function getReturnToSourceFee(bytes32 recoveryId)
        external
        view
        returns (uint256);

    /**
     * @notice Dispatches one pending recovery to its recorded source chain and
     * original sender.
     * @dev Callable by the original recipient, even when blacklisted, or by an
     * escrow admin. The Router fee is re-quoted in this transaction, exact fee
     * is sent, and any excess native currency is refunded atomically.
     * @param recoveryId Pending returnable recovery to dispatch.
     * @return outboundCcipMessageId Message ID returned by the CCIP Router.
     */
    function returnToSource(bytes32 recoveryId)
        external
        payable
        returns (bytes32 outboundCcipMessageId);

    /**
     * @notice Changes the recipient used by future confiscations.
     * @dev Restricted to escrow admins. The recipient cannot be zero, this
     * escrow, or its bound pool.
     * @param newDefaultRecipient New confiscation recipient.
     */
    function setDefaultRecipient(address newDefaultRecipient) external;

    /**
     * @notice Enables or disables one remote escrow as return-message provenance.
     * @dev Restricted to escrow admins. This setting affects only recoveries
     * registered after the update and does not configure a CCIP route.
     * @param sourceChainSelector Chainlink selector associated with the peer.
     * @param peerEscrow Nonzero remote escrow address.
     * @param allowed Whether new records from this peer are non-returnable.
     */
    function setPeerEscrow(
        uint64 sourceChainSelector,
        address peerEscrow,
        bool allowed
    ) external;
}
