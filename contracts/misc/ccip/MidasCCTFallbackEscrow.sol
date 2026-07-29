// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import {ERC165Upgradeable as ERC165} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {Pool} from "@chainlink/contracts-ccip/contracts/libraries/Pool.sol";
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
    function onFailedMessage(address _originalRecipient, uint256 _tokenAmount)
        external
    {
        require(msg.sender == address(tokenPool), NotTokenPool());
        bytes32 _messageId = _registerFailedMessages(
            _originalRecipient,
            _tokenAmount
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
            MessageStatus.Claimed
        );
        address _expectedSender = failedMessage.originalRecipient;
        require(msg.sender == _expectedSender, InvalidSender(_expectedSender));
        emit Claim(_messageId, _recipient);
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
                MessageStatus.Recovered
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
            _processMessage(_messageIds[i], address(0), MessageStatus.Closed);
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
                message.tokenAmount
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
     * @inheritdoc IMidasCCTFallbackEscrow
     */
    function getFailedMessage(bytes32 _messageId)
        external
        view
        returns (FailedMessage memory)
    {
        return failedMessages[_messageId];
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
        MessageStatus _status
    ) private returns (FailedMessage storage) {
        require(
            _failedMessageIds.contains(_messageId),
            FailedMessageNotFound(_messageId)
        );
        FailedMessage storage failedMessage = failedMessages[_messageId];
        failedMessage.status = _status;
        _failedMessageIds.remove(_messageId);

        IERC20(address(tokenPool.getToken())).safeTransfer(
            _extractRecipient(failedMessage, _overrideRecipient, _status),
            failedMessage.tokenAmount
        );

        return failedMessage;
    }

    /**
     * @notice registers a failed message
     * @param _originalRecipient the original recipient of the failed message
     * @param _tokenAmount the amount of tokens to recover
     * @return messageId the message id
     */
    function _registerFailedMessages(
        address _originalRecipient,
        uint256 _tokenAmount
    ) private returns (bytes32 messageId) {
        messageId = _getMessageId(
            _originalRecipient,
            _tokenAmount,
            failedMessageCount++
        );
        failedMessages[messageId] = FailedMessage({
            status: MessageStatus.Pending,
            originalRecipient: _originalRecipient,
            tokenAmount: _tokenAmount
        });
        _failedMessageIds.add(messageId);
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
     * @notice generates a message id
     * @param _originalRecipient the original recipient of the failed message
     * @param _tokenAmount the amount of tokens to recover
     * @param _index the index of the failed message
     * @return the message id
     */
    function _getMessageId(
        address _originalRecipient,
        uint256 _tokenAmount,
        uint256 _index
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(_originalRecipient, _tokenAmount, _index)
            );
    }
}
