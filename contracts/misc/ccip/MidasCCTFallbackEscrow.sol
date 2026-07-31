// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {ERC165Upgradeable as ERC165} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";

import {WithMidasAccessControl} from "../../access/WithMidasAccessControl.sol";
import {Blacklistable} from "../../access/Blacklistable.sol";
import {IMidasCCTFallbackEscrow} from "../../interfaces/ccip/IMidasCCTFallbackEscrow.sol";
import {IMidasCCTFailedMessageFallback} from "../../interfaces/ccip/IMidasCCTFailedMessageFallback.sol";

contract MidasCCTFallbackEscrow is
    IMidasCCTFallbackEscrow,
    WithMidasAccessControl,
    Blacklistable,
    ERC165
{
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /**
     * @notice Role for the fallback escrow admin
     */
    bytes32 public constant FALLBACK_ESCROW_ADMIN_ROLE =
        keccak256("FALLBACK_ESCROW_ADMIN_ROLE");

    /**
     * @notice The token pool
     */
    TokenPool public tokenPool;

    /**
     * @notice The default recipient
     */
    address public defaultRecipient;

    /**
     * @notice The counter of failed messages
     */
    uint256 public failedMessageCount;

    /**
     * @notice mapping of failed message id to message content
     */
    mapping(bytes32 => FailedMessage) public failedMessages;

    /**
     * @notice unresolved failed message ids
     */
    EnumerableSet.Bytes32Set private _failedMessageIds;

    /**
     * @notice Modifier to check if the caller is the contract admin
     */
    modifier onlyContractAdmin() {
        require(
            accessControl.hasRole(FALLBACK_ESCROW_ADMIN_ROLE, msg.sender),
            NotContractAdmin()
        );
        _;
    }

    /**
     * @notice initializes the contract
     * @param _accessControl the access control address
     * @param _tokenPool the token pool address to set
     * @param _defaultRecipient the default recipient to set
     */
    function initialize(
        address _accessControl,
        address _tokenPool,
        address _defaultRecipient
    ) external initializer {
        __WithMidasAccessControl_init(_accessControl);

        _validateAddress(_tokenPool);
        tokenPool = TokenPool(_tokenPool);

        _setDefaultRecipient(_defaultRecipient);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function setDefaultRecipient(address _defaultRecipient)
        external
        onlyContractAdmin
    {
        _setDefaultRecipient(_defaultRecipient);
    }

    /**
     * @inheritdoc IMidasCCTFailedMessageFallback
     */
    function onFailedMessage(
        address _originalRecipient,
        uint256 _tokenAmount,
        uint64 _originalSourceChainSelector
    ) external {
        require(msg.sender == address(tokenPool), NotTokenPool());
        bytes32 _messageId = _registerFailedMessages(
            _originalRecipient,
            _tokenAmount,
            _originalSourceChainSelector
        );
        emit OnFailedMessage(_messageId);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function claim(bytes32 _messageId, address _recipient)
        external
        onlyNotBlacklisted(msg.sender)
    {
        FailedMessage storage failedMessage = _processMessage(
            _messageId,
            _recipient,
            MessageStatus.Claimed,
            true
        );
        _validateClaim(failedMessage.originalRecipient);
        emit Claim(_messageId, _recipient);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function claimToRemote(
        bytes32 _messageId,
        bytes memory _recipient,
        uint64 _remoteChainSelector
    ) external payable onlyNotBlacklisted(msg.sender) {
        FailedMessage storage failedMessage = _processMessage(
            _messageId,
            address(0),
            MessageStatus.Claimed,
            false
        );
        _validateClaim(failedMessage.originalRecipient);
        bytes32 ccipMessageId = _sendToRemote(
            _recipient,
            _remoteChainSelector,
            failedMessage.tokenAmount
        );

        emit ClaimToRemote(
            _messageId,
            ccipMessageId,
            _recipient,
            _remoteChainSelector
        );
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function recoverBulk(bytes32[] memory _messageIds)
        external
        onlyContractAdmin
    {
        for (uint256 i = 0; i < _messageIds.length; i++) {
            _processMessage(
                _messageIds[i],
                address(0),
                MessageStatus.Recovered,
                true
            );
        }
        emit RecoverBulk(_messageIds);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function closeBulk(bytes32[] memory _messageIds)
        external
        onlyContractAdmin
    {
        for (uint256 i = 0; i < _messageIds.length; i++) {
            _processMessage(
                _messageIds[i],
                address(0),
                MessageStatus.Closed,
                true
            );
        }
        emit CloseBulk(_messageIds);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function registerOrphanedBulk(
        IMidasCCTFallbackEscrow.OrphanedMessage[] calldata _messages
    ) external onlyContractAdmin {
        for (uint256 i = 0; i < _messages.length; i++) {
            OrphanedMessage calldata message = _messages[i];
            _registerFailedMessages(
                message.originalRecipient,
                message.tokenAmount,
                message.originalSourceChainSelector
            );
        }
        emit RegisterOrphanedBulk(_messages);
    }

    /**
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function getFailedMessageIds() external view returns (bytes32[] memory) {
        return _failedMessageIds.values();
    }

    /**
     * @inheritdoc ERC165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == type(IMidasCCTFailedMessageFallback).interfaceId ||
            interfaceId == type(IMidasCCTFallbackEscrow).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice processes a failed message
     * @param _messageId the id of the failed message
     * @param _overrideRecipient the override recipient to set
     * @param _status the new status of the failed message
     * @return the updated failed message
     */
    function _processMessage(
        bytes32 _messageId,
        address _overrideRecipient,
        MessageStatus _status,
        bool _doTransfer
    ) private returns (FailedMessage storage) {
        require(
            _failedMessageIds.contains(_messageId),
            FailedMessageNotFound(_messageId)
        );
        FailedMessage storage failedMessage = failedMessages[_messageId];
        failedMessage.status = _status;
        _failedMessageIds.remove(_messageId);

        if (_doTransfer) {
            _getToken().safeTransfer(
                _extractRecipient(failedMessage, _overrideRecipient, _status),
                failedMessage.tokenAmount
            );
        }

        return failedMessage;
    }

    /**
     * @notice registers a failed message
     * @param _originalRecipient the original recipient of the failed message
     * @param _tokenAmount the amount of tokens to recover
     * @param _originalSourceChainSelector the original source chain selector
     * @return messageId the message id
     */
    function _registerFailedMessages(
        address _originalRecipient,
        uint256 _tokenAmount,
        uint64 _originalSourceChainSelector
    ) private returns (bytes32 messageId) {
        messageId = _getMessageId(
            _originalRecipient,
            _tokenAmount,
            _originalSourceChainSelector,
            failedMessageCount++
        );
        failedMessages[messageId] = FailedMessage({
            status: MessageStatus.Pending,
            originalRecipient: _originalRecipient,
            tokenAmount: _tokenAmount,
            originalSourceChainSelector: _originalSourceChainSelector
        });
        _failedMessageIds.add(messageId);
    }

    /**
     * @notice Sends escrowed tokens cross-chain via the CCIP Router.
     * @dev Pays fees in native gas token (`feeToken = address(0)`). Caller is
     * responsible for attaching a sufficient `msg.value` fee.
     * @param _recipient ABI-encoded destination receiver
     * @param _remoteChainSelector Destination chain selector
     * @param _tokenAmount Amount of the pool token to send
     */
    function _sendToRemote(
        bytes memory _recipient,
        uint64 _remoteChainSelector,
        uint256 _tokenAmount
    ) private returns (bytes32) {
        IERC20 token = _getToken();
        (address routerAddress, , ) = tokenPool.getDynamicConfig();
        IRouterClient router = IRouterClient(routerAddress);

        Client.EVMTokenAmount[]
            memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: address(token),
            amount: _tokenAmount
        });

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: _recipient,
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: Client._argsToBytes(
                Client.GenericExtraArgsV2({
                    gasLimit: 0,
                    allowOutOfOrderExecution: true
                })
            )
        });

        token.safeApprove(routerAddress, _tokenAmount);

        return router.ccipSend{value: msg.value}(_remoteChainSelector, message);
    }

    /**
     * @notice validates and sets the default recipient
     * @param _defaultRecipient the default recipient to set
     */
    function _setDefaultRecipient(address _defaultRecipient) private {
        _validateAddress(_defaultRecipient);
        defaultRecipient = _defaultRecipient;
        emit SetDefaultRecipient(_defaultRecipient);
    }

    /**
     * @notice extracts the recipient of the failed message
     * @param _failedMessage the failed message
     * @param _overrideRecipient the override recipient to set
     * @param _status the status of the failed message
     * @return the recipient of the failed message
     */
    function _extractRecipient(
        FailedMessage storage _failedMessage,
        address _overrideRecipient,
        MessageStatus _status
    ) private view returns (address) {
        if (_overrideRecipient != address(0)) {
            return _overrideRecipient;
        }

        if (_status == MessageStatus.Closed) {
            return defaultRecipient;
        } else {
            return _failedMessage.originalRecipient;
        }
    }

    /**
     * @notice validates an address
     * @param _address the address to validate
     */
    function _validateAddress(address _address) private view {
        require(_address != address(0), ZeroAddress());
    }

    /**
     * @notice gets the token
     * @return the token
     */
    function _getToken() private view returns (IERC20) {
        return IERC20(address(tokenPool.getToken()));
    }

    /**
     * @notice validates the claim
     * @param _expectedSender the expected sender
     */
    function _validateClaim(address _expectedSender) private view {
        require(msg.sender == _expectedSender, InvalidSender(_expectedSender));
    }

    /**
     * @notice generates a message id
     * @param _originalRecipient the original recipient of the failed message
     * @param _tokenAmount the amount of tokens to recover
     * @param _index the index of the failed message
     * @return the message id
     */
    function _getMessageId(
        address _originalRecipient,
        uint256 _tokenAmount,
        uint64 _originalSourceChainSelector,
        uint256 _index
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    _originalRecipient,
                    _tokenAmount,
                    _originalSourceChainSelector,
                    _index
                )
            );
    }
}
