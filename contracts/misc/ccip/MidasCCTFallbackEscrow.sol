// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {ERC165CheckerUpgradeable as ERC165Checker} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import {ERC165Upgradeable as ERC165} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {ReentrancyGuardUpgradeable as ReentrancyGuard} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20 as IERC20V5} from "@openzeppelin/contracts@5.3.0/token/ERC20/IERC20.sol";

import {IPoolV2} from "@chainlink/contracts-ccip/contracts/interfaces/IPoolV2.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {ExtraArgsCodec} from "@chainlink/contracts-ccip/contracts/libraries/ExtraArgsCodec.sol";
import {FinalityCodec} from "@chainlink/contracts-ccip/contracts/libraries/FinalityCodec.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";

import {Blacklistable} from "../../access/Blacklistable.sol";
import {IMidasCCTFallbackEscrow} from "../../interfaces/ccip/IMidasCCTFallbackEscrow.sol";
import {IMidasCCTFallbackReceiver} from "../../interfaces/ccip/IMidasCCTFallbackReceiver.sol";

interface IMidasAccessControlledToken {
    function accessControl() external view returns (address);
}

/**
 * @title MidasCCTFallbackEscrow
 * @notice Holds fully funded recoveries created by the Midas CCIP 2.0 pool.
 */
contract MidasCCTFallbackEscrow is
    IMidasCCTFallbackEscrow,
    Blacklistable,
    ERC165,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    bytes32 public constant FALLBACK_ESCROW_ADMIN_ROLE =
        keccak256("FALLBACK_ESCROW_ADMIN_ROLE");

    bytes32 private constant _RECOVERY_ID_DOMAIN =
        keccak256("MIDAS_CCT_RECOVERY_V1");

    address public override tokenPool;
    address public token;
    address public defaultRecipient;

    uint256 public recoveryCount;
    uint256 public pendingCount;
    uint256 public totalReserved;

    mapping(bytes32 => RecoveryRecord) public recoveries;
    mapping(uint64 => mapping(address => bool)) public isPeerEscrow;

    modifier onlyEscrowAdmin() {
        if (!_isEscrowAdmin(msg.sender)) revert NotEscrowAdmin(msg.sender);
        _;
    }

    /**
     * @notice Initializes the escrow and binds it to one pool/token pair.
     */
    function initialize(
        address suppliedAccessControl,
        address configuredTokenPool,
        address configuredDefaultRecipient
    ) external initializer {
        __Blacklistable_init(suppliedAccessControl);
        __ERC165_init();
        __ReentrancyGuard_init();

        if (
            configuredTokenPool == address(0) ||
            configuredTokenPool.code.length == 0 ||
            !ERC165Checker.supportsInterface(
                configuredTokenPool,
                type(IPoolV2).interfaceId
            )
        ) revert InvalidPool(configuredTokenPool);

        address configuredToken;
        try TokenPool(configuredTokenPool).getToken() returns (
            IERC20V5 tokenContract
        ) {
            configuredToken = address(tokenContract);
        } catch {
            revert InvalidPool(configuredTokenPool);
        }
        if (configuredToken == address(0) || configuredToken.code.length == 0)
            revert InvalidPool(configuredTokenPool);

        address tokenAccessControl;
        try
            IMidasAccessControlledToken(configuredToken).accessControl()
        returns (address configuredAccessControl) {
            tokenAccessControl = configuredAccessControl;
        } catch {
            revert InvalidPool(configuredTokenPool);
        }
        if (tokenAccessControl != suppliedAccessControl)
            revert AccessControlMismatch(
                suppliedAccessControl,
                tokenAccessControl
            );

        tokenPool = configuredTokenPool;
        token = configuredToken;
        _setDefaultRecipient(configuredDefaultRecipient);
    }

    /**
     * @inheritdoc IMidasCCTFallbackReceiver
     */
    function onFallbackMinted(
        address originalSender,
        address originalRecipient,
        uint64 originalSourceChainSelector,
        uint256 amount
    ) external override {
        if (msg.sender != tokenPool) revert NotTokenPool(msg.sender);
        _registerRecovery(
            originalSender,
            originalRecipient,
            originalSourceChainSelector,
            amount
        );
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function setDefaultRecipient(address newDefaultRecipient)
        external
        override
        onlyEscrowAdmin
    {
        _setDefaultRecipient(newDefaultRecipient);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function setPeerEscrow(
        uint64 sourceChainSelector,
        address peerEscrow,
        bool allowed
    ) external override onlyEscrowAdmin {
        if (peerEscrow == address(0)) revert ZeroAddress();
        isPeerEscrow[sourceChainSelector][peerEscrow] = allowed;
        emit PeerEscrowSet(sourceChainSelector, peerEscrow, allowed);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function claim(bytes32 recoveryId, address recipient)
        external
        override
        nonReentrant
        onlyNotBlacklisted(msg.sender)
    {
        RecoveryRecord storage recovery = _requirePending(recoveryId);
        if (msg.sender != recovery.originalRecipient)
            revert UnauthorizedRecoveryCaller(recoveryId, msg.sender);
        _validateLocalRecipient(recipient);
        _assertSolvent();
        _consumeRecovery(recovery, RecoveryStatus.Claimed);

        IERC20(token).safeTransfer(recipient, recovery.amount);
        emit RecoveryClaimed(
            recoveryId,
            recovery.originalRecipient,
            recipient,
            recovery.amount
        );
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function adminRecoverBulk(LocalRecovery[] calldata localRecoveries)
        external
        override
        nonReentrant
        onlyEscrowAdmin
    {
        if (localRecoveries.length == 0) revert EmptyBatch();
        _assertSolvent();

        for (uint256 i = 0; i < localRecoveries.length; ++i) {
            LocalRecovery calldata localRecovery = localRecoveries[i];
            _validateLocalRecipient(localRecovery.recipient);
            RecoveryRecord storage recovery = _requirePending(
                localRecovery.recoveryId
            );
            _consumeRecovery(recovery, RecoveryStatus.AdminRecovered);

            IERC20(token).safeTransfer(
                localRecovery.recipient,
                recovery.amount
            );
            emit RecoveryAdminRecovered(
                localRecovery.recoveryId,
                msg.sender,
                localRecovery.recipient,
                recovery.originalRecipient,
                recovery.amount
            );
        }
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function confiscateBulk(bytes32[] calldata recoveryIds)
        external
        override
        nonReentrant
        onlyEscrowAdmin
    {
        if (recoveryIds.length == 0) revert EmptyBatch();
        _assertSolvent();

        uint256 confiscatedAmount;
        for (uint256 i = 0; i < recoveryIds.length; ++i) {
            RecoveryRecord storage recovery = _requirePending(recoveryIds[i]);
            _consumeRecovery(recovery, RecoveryStatus.Confiscated);
            confiscatedAmount += recovery.amount;
            emit RecoveryConfiscated(
                recoveryIds[i],
                msg.sender,
                defaultRecipient,
                recovery.amount
            );
        }

        IERC20(token).safeTransfer(defaultRecipient, confiscatedAmount);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function getReturnToSourceFee(bytes32 recoveryId)
        external
        view
        override
        returns (uint256)
    {
        RecoveryRecord storage recovery = _requirePending(recoveryId);
        if (!recovery.returnable) revert RecoveryNotReturnable(recoveryId);
        IRouterClient router = _router();
        return
            router.getFee(
                recovery.originalSourceChainSelector,
                _buildReturnMessage(recovery)
            );
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function returnToSource(bytes32 recoveryId)
        external
        payable
        override
        nonReentrant
        returns (bytes32 outboundCcipMessageId)
    {
        RecoveryRecord storage recovery = _requirePending(recoveryId);
        if (!recovery.returnable) revert RecoveryNotReturnable(recoveryId);
        if (
            msg.sender != recovery.originalRecipient &&
            !_isEscrowAdmin(msg.sender)
        ) revert UnauthorizedRecoveryCaller(recoveryId, msg.sender);

        _assertSolvent();
        IRouterClient router = _router();
        Client.EVM2AnyMessage memory message = _buildReturnMessage(recovery);
        uint256 fee = router.getFee(
            recovery.originalSourceChainSelector,
            message
        );
        if (msg.value < fee) revert InsufficientCcipFee(msg.value, fee);

        _consumeRecovery(recovery, RecoveryStatus.ReturnDispatched);

        IERC20 tokenContract = IERC20(token);
        tokenContract.safeApprove(address(router), 0);
        tokenContract.safeApprove(address(router), recovery.amount);
        outboundCcipMessageId = router.ccipSend{value: fee}(
            recovery.originalSourceChainSelector,
            message
        );
        tokenContract.safeApprove(address(router), 0);
        recovery.outboundCcipMessageId = outboundCcipMessageId;

        _refundNative(msg.sender, msg.value - fee);
        emit RecoveryReturnDispatched(
            recoveryId,
            outboundCcipMessageId,
            msg.sender,
            recovery.originalSourceChainSelector,
            recovery.originalSender,
            recovery.amount
        );
    }

    /**
     * @inheritdoc ERC165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IMidasCCTFallbackReceiver).interfaceId ||
            interfaceId == type(IMidasCCTFallbackEscrow).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _registerRecovery(
        address originalSender,
        address originalRecipient,
        uint64 originalSourceChainSelector,
        uint256 amount
    ) private {
        if (originalSender == address(0))
            revert InvalidOriginalSender(originalSender);
        if (amount == 0) revert InvalidAmount(amount);

        uint256 requiredBalance = totalReserved + amount;
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (tokenBalance < requiredBalance)
            revert InsufficientEscrowFunding(tokenBalance, requiredBalance);

        uint256 nonce = recoveryCount;
        bytes32 recoveryId = keccak256(
            abi.encode(
                _RECOVERY_ID_DOMAIN,
                block.chainid,
                address(this),
                nonce,
                originalSender,
                originalRecipient,
                originalSourceChainSelector,
                amount
            )
        );
        bool returnable = !isPeerEscrow[originalSourceChainSelector][
            originalSender
        ];

        recoveries[recoveryId] = RecoveryRecord({
            originalSender: originalSender,
            originalRecipient: originalRecipient,
            originalSourceChainSelector: originalSourceChainSelector,
            amount: amount,
            status: RecoveryStatus.Pending,
            returnable: returnable,
            outboundCcipMessageId: bytes32(0)
        });
        recoveryCount = nonce + 1;
        ++pendingCount;
        totalReserved = requiredBalance;

        emit RecoveryRegistered(
            recoveryId,
            originalSender,
            originalRecipient,
            originalSourceChainSelector,
            amount,
            returnable
        );
    }

    function _requirePending(bytes32 recoveryId)
        private
        view
        returns (RecoveryRecord storage recovery)
    {
        recovery = recoveries[recoveryId];
        if (recovery.status != RecoveryStatus.Pending)
            revert RecoveryNotPending(recoveryId, recovery.status);
    }

    function _validateLocalRecipient(address recipient) private view {
        if (
            recipient == address(0) ||
            recipient == address(this) ||
            recipient == tokenPool
        ) revert InvalidLocalRecipient(recipient);
    }

    function _consumeRecovery(
        RecoveryRecord storage recovery,
        RecoveryStatus terminalStatus
    ) private {
        recovery.status = terminalStatus;
        --pendingCount;
        totalReserved -= recovery.amount;
    }

    function _assertSolvent() private view {
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (tokenBalance < totalReserved)
            revert EscrowInsolvent(tokenBalance, totalReserved);
    }

    function _buildReturnMessage(RecoveryRecord storage recovery)
        private
        view
        returns (Client.EVM2AnyMessage memory message)
    {
        Client.EVMTokenAmount[]
            memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: token,
            amount: recovery.amount
        });

        message = Client.EVM2AnyMessage({
            receiver: abi.encode(recovery.originalSender),
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: ExtraArgsCodec._getBasicEncodedExtraArgsV3(
                0,
                FinalityCodec.WAIT_FOR_FINALITY_FLAG
            )
        });
    }

    function _router() private view returns (IRouterClient router) {
        (address routerAddress, , ) = TokenPool(tokenPool).getDynamicConfig();
        if (routerAddress == address(0) || routerAddress.code.length == 0)
            revert InvalidRouter(routerAddress);
        router = IRouterClient(routerAddress);
    }

    function _refundNative(address recipient, uint256 amount) private {
        if (amount == 0) return;
        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert NativeRefundFailed(recipient, amount);
    }

    function _isEscrowAdmin(address account) private view returns (bool) {
        return accessControl.hasRole(FALLBACK_ESCROW_ADMIN_ROLE, account);
    }

    function _setDefaultRecipient(address newDefaultRecipient) private {
        _validateLocalRecipient(newDefaultRecipient);
        address oldDefaultRecipient = defaultRecipient;
        defaultRecipient = newDefaultRecipient;
        emit DefaultRecipientSet(oldDefaultRecipient, newDefaultRecipient);
    }
}
