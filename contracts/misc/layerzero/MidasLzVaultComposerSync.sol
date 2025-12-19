// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IOFT, SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {IOAppCore} from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import {ILayerZeroEndpointV2} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import {IDepositVault} from "../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../interfaces/IRedemptionVault.sol";
import {DecimalsCorrectionLibrary} from "../../libraries/DecimalsCorrectionLibrary.sol";
import {IMidasLzVaultComposerSync} from "./interfaces/IMidasLzVaultComposerSync.sol";
import {MidasInitializable} from "../../abstract/MidasInitializable.sol";

/**
 * @title MidasLzVaultComposerSync - Synchronous Vault Composer for Midas vaults
 * @notice This contract is a composer that allows deposits and redemptions operations against a
 *         synchronous vault across different chains using LayerZero's OFT protocol.
 * @dev The contract is designed to handle deposits and redemptions of vault mTokens and paymentTokens,
 *      ensuring that the mToken and paymentToken are correctly managed and transferred across chains.
 *      It also includes slippage protection and refund mechanisms for failed transactions.
 * @dev Default refunds are enabled to EOA addresses only on the source.
 */
contract MidasLzVaultComposerSync is
    IMidasLzVaultComposerSync,
    MidasInitializable,
    ReentrancyGuardUpgradeable
{
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice error for token address mismatch
     * @param oftTokenValue address of OFT token
     * @param dvValue address of mToken of deposit vault
     * @param rvValue address of mToken of redemption vault
     */
    error TokenAddressMismatch(
        address oftTokenValue,
        address dvValue,
        address rvValue
    );

    /**
     * @notice error for invalid token rate
     * @param feed address of failed data feed contract
     */
    error InvalidTokenRate(address feed);

    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    IDepositVault public immutable depositVault;
    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    IRedemptionVault public immutable redemptionVault;
    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    address public immutable paymentTokenOft;
    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    address public immutable paymentTokenErc20;
    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    address public immutable mTokenOft;
    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    address public immutable mTokenErc20;

    /**
     * @notice decimals of `paymentTokenErc20`
     */
    uint8 public immutable paymentTokenDecimals;

    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    address public immutable lzEndpoint;
    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    uint32 public immutable thisChaindEid;

    /**
     * @notice Initializes the VaultComposerSync contract with vault and OFT token addresses
     * @param _depositVault The address of the deposit vault contract
     * @param _redemptionVault The address of the redemption vault contract
     * @param _paymentTokenOft The address of the paymentToken OFT contract
     * @param _mTokenOft The address of the mToken OFT contract
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _depositVault,
        address _redemptionVault,
        address _paymentTokenOft,
        address _mTokenOft
    ) MidasInitializable() {
        depositVault = IDepositVault(_depositVault);
        redemptionVault = IRedemptionVault(_redemptionVault);

        paymentTokenOft = _paymentTokenOft;
        paymentTokenErc20 = IOFT(paymentTokenOft).token();
        paymentTokenDecimals = IERC20(paymentTokenErc20).decimals();

        mTokenOft = _mTokenOft;
        mTokenErc20 = IOFT(mTokenOft).token();

        {
            address mTokenDv = address(depositVault.mToken());
            address mTokenRv = address(redemptionVault.mToken());
            if (mTokenErc20 != mTokenDv || mTokenErc20 != mTokenRv) {
                revert TokenAddressMismatch(mTokenErc20, mTokenDv, mTokenRv);
            }
        }

        lzEndpoint = address(IOAppCore(paymentTokenOft).endpoint());
        thisChaindEid = ILayerZeroEndpointV2(lzEndpoint).eid();
    }

    /**
     * @notice Initializes the contract
     */
    function initialize() external initializer {
        /// @dev Approve the vault to spend the paymentToken held by this contract
        IERC20(paymentTokenErc20).approve(
            address(depositVault),
            type(uint256).max
        );
        IERC20(mTokenErc20).approve(
            address(redemptionVault),
            type(uint256).max
        );

        /// @dev If the paymentToken OFT is an adapter, approve it as well
        if (IOFT(paymentTokenOft).approvalRequired()) {
            IERC20(paymentTokenErc20).approve(
                paymentTokenOft,
                type(uint256).max
            );
        }
    }

    /**
     * @notice Handles LayerZero compose operations for vault transactions with automatic refund functionality
     * @dev This composer is designed to handle refunds to an EOA address and not a contract
     * @dev Any revert in handleCompose() causes a refund back to the src EXCEPT for InsufficientMsgValue
     * @param _composeSender The OFT contract address used for refunds, must be either paymentTokenOft or mTokenOft
     * @param _guid LayerZero's unique tx id (created on the source tx)
     * @param _message Decomposable bytes object into [composeHeader][composeMessage]
     */
    function lzCompose(
        address _composeSender, // The OFT used on refund, also the vaultIn token.
        bytes32 _guid,
        bytes calldata _message, // expected to contain a composeMessage = abi.encode(SendParam hopSendParam,uint256 minMsgValue,bytes extraOptions)
        address, /*_executor*/
        bytes calldata /*_extraData*/
    ) external payable override {
        if (msg.sender != lzEndpoint) {
            revert OnlyEndpoint(msg.sender);
        }
        if (_composeSender != paymentTokenOft && _composeSender != mTokenOft) {
            revert OnlyValidComposeCaller(_composeSender);
        }

        bytes32 composeFrom = _message.composeFrom();
        uint256 amount = _message.amountLD();
        bytes memory composeMsg = _message.composeMsg();

        /// @dev try...catch to handle the compose operation. if it fails we refund the user
        try
            this.handleCompose{value: msg.value}(
                _composeSender,
                composeFrom,
                composeMsg,
                amount
            )
        {
            emit Sent(_guid);
        } catch (bytes memory _err) {
            /// @dev A revert where the msg.value passed is lower than the min expected msg.value is handled separately
            /// This is because it is possible to re-trigger from the endpoint the compose operation with the right msg.value
            if (bytes4(_err) == InsufficientMsgValue.selector) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    revert(add(32, _err), mload(_err))
                }
            }

            // solhint-disable-next-line avoid-tx-origin
            _refund(_composeSender, _message, amount, tx.origin);
            emit Refunded(_guid);
        }
    }

    /**
     * @notice Handles the compose operation for OFT transactions
     * @dev This function can only be called by the contract itself (self-call restriction)
     *      Decodes the compose message to extract SendParam and minimum message value
     *      Routes to either deposit or redeem flow based on the input OFT token type
     * @param _oftIn The OFT token whose funds have been received in the lzReceive associated with this lzTx
     * @param _composeFrom The bytes32 identifier of the compose sender
     * @param _composeMsg The encoded message containing SendParam, minMsgValue and extraOptions
     * @param _amount The amount of tokens received in the lzReceive associated with this lzTx
     */
    function handleCompose(
        address _oftIn,
        bytes32 _composeFrom,
        bytes memory _composeMsg,
        uint256 _amount
    ) public payable virtual {
        /// @dev Can only be called by self
        if (msg.sender != address(this)) {
            revert OnlySelf(msg.sender);
        }

        /// SendParam defines how the composer will handle the user's funds
        /// The minMsgValue is the minimum amount of msg.value that must be sent,
        /// failing to do so will revert and the transaction will be retained in the endpoint for future retries
        (
            SendParam memory sendParam,
            uint256 minMsgValue,
            bytes memory extraOptions
        ) = abi.decode(_composeMsg, (SendParam, uint256, bytes));

        if (msg.value < minMsgValue) {
            revert InsufficientMsgValue(minMsgValue, msg.value);
        }

        if (_oftIn == paymentTokenOft) {
            _depositAndSend(
                _composeFrom,
                _amount,
                extraOptions,
                sendParam,
                // solhint-disable-next-line avoid-tx-origin
                tx.origin
            );
        } else {
            _redeemAndSend(
                _composeFrom,
                _amount,
                extraOptions,
                sendParam,
                // solhint-disable-next-line avoid-tx-origin
                tx.origin
            );
        }
    }

    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    function depositAndSend(
        uint256 _paymentTokenAmount,
        bytes memory _extraOptions,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable nonReentrant {
        IERC20(paymentTokenErc20).safeTransferFrom(
            msg.sender,
            address(this),
            _paymentTokenAmount
        );
        _depositAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _paymentTokenAmount,
            _extraOptions,
            _sendParam,
            _refundAddress
        );
    }

    /**
     * @inheritdoc IMidasLzVaultComposerSync
     */
    function redeemAndSend(
        uint256 _mTokenAmount,
        bytes memory _extraOptions,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable nonReentrant {
        IERC20(mTokenErc20).safeTransferFrom(
            msg.sender,
            address(this),
            _mTokenAmount
        );
        _redeemAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _mTokenAmount,
            _extraOptions,
            _sendParam,
            _refundAddress
        );
    }

    /**
     * @dev Internal function that deposits paymentTokens and sends mTokens to another chain
     * @param _depositor The depositor (bytes32 format to account for non-evm addresses)
     * @param _paymentTokenAmount The number of paymentTokens to deposit
     * @param _extraOptions Extra options for the deposit operation
     * @param _sendParam Parameter that defines how to send the mTokens
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first deposits the paymentTokens to mint mTokens, validates the mTokens meet minimum slippage requirements,
     *         then sends the minted mTokens cross-chain using the OFT protocol
     * @notice The _sendParam.amountLD is updated to the actual mToken amount minted, and minAmountLD is reset to 0 for the send operation
     */
    function _depositAndSend(
        bytes32 _depositor,
        uint256 _paymentTokenAmount,
        bytes memory _extraOptions,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal {
        bool receiveToSameNetwork = _sendParam.dstEid == thisChaindEid;

        bytes32 referrerId = _parseDepositExtraOptions(_extraOptions);

        uint256 mTokenAmount = _deposit(
            receiveToSameNetwork
                ? _sendParam.to.bytes32ToAddress()
                : address(this),
            _paymentTokenAmount,
            _sendParam.minAmountLD,
            referrerId
        );

        if (!receiveToSameNetwork) {
            _sendParam.amountLD = mTokenAmount;

            _sendOft(mTokenOft, _sendParam, _refundAddress);
        } else {
            _requireNoValue();
        }

        emit Deposited(
            _depositor,
            _sendParam.to,
            _sendParam.dstEid,
            _paymentTokenAmount,
            mTokenAmount
        );
    }

    /**
     * @dev Internal function that redeems mTokens for paymentTokens and sends them cross-chain
     * @param _redeemer The address of the redeemer in bytes32 format
     * @param _mTokenAmount The number of mTokens to redeem
     * @param _sendParam Parameter that defines how to send the paymentTokens
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first redeems the specified mToken amount for the underlying paymentToken,
     *         validates the received amount against slippage protection, then initiates a cross-chain
     *         transfer of the redeemed paymentTokens using the OFT protocol
     * @notice The minAmountLD in _sendParam is reset to 0 after slippage validation since the
     *         actual amount has already been verified
     */
    function _redeemAndSend(
        bytes32 _redeemer,
        uint256 _mTokenAmount,
        bytes memory, /* _extraOptions */
        SendParam memory _sendParam,
        address _refundAddress
    ) internal {
        bool receiveToSameNetwork = _sendParam.dstEid == thisChaindEid;

        uint256 paymentTokenAmount = _redeem(
            receiveToSameNetwork
                ? _sendParam.to.bytes32ToAddress()
                : address(this),
            _mTokenAmount,
            _sendParam.minAmountLD
        );

        if (!receiveToSameNetwork) {
            _sendParam.amountLD = paymentTokenAmount;

            _sendOft(paymentTokenOft, _sendParam, _refundAddress);
        } else {
            _requireNoValue();
        }

        emit Redeemed(
            _redeemer,
            _sendParam.to,
            _sendParam.dstEid,
            _mTokenAmount,
            paymentTokenAmount
        );
    }

    /**
     * @dev Internal function to deposit paymentTokens into the vault
     * @param _paymentTokenAmount The number of paymentTokens to deposit into the vault
     * @param _minReceiveAmount The minimum amount of mTokens to receive
     * @param _receiver The address to receive the mTokens
     * @param _referrerId The referrer id
     * @return mTokenAmount The number of mTokens received from the vault deposit
     */
    function _deposit(
        address _receiver,
        uint256 _paymentTokenAmount,
        uint256 _minReceiveAmount,
        bytes32 _referrerId
    ) internal returns (uint256 mTokenAmount) {
        uint256 balanceBefore = _balanceOf(mTokenErc20, _receiver);
        depositVault.depositInstant(
            paymentTokenErc20,
            _tokenAmountToBase18(_paymentTokenAmount),
            _minReceiveAmount,
            _referrerId,
            _receiver
        );

        mTokenAmount = _balanceOf(mTokenErc20, _receiver) - balanceBefore;
    }

    /**
     * @dev Internal function to redeem mTokens from the vault
     * @param _receiver The address to receive the paymentTokens
     * @param _mTokenAmount The number of mTokens to redeem from the vault
     * @param _minReceiveAmount The minimum amount of paymentTokens to receive
     * @return paymentTokenAmount The number of paymentTokens received from the vault redemption
     */
    function _redeem(
        address _receiver,
        uint256 _mTokenAmount,
        uint256 _minReceiveAmount
    ) internal returns (uint256 paymentTokenAmount) {
        uint256 balanceBefore = _balanceOf(paymentTokenErc20, _receiver);
        redemptionVault.redeemInstant(
            paymentTokenErc20,
            _mTokenAmount,
            _minReceiveAmount,
            _receiver
        );

        paymentTokenAmount =
            _balanceOf(paymentTokenErc20, _receiver) -
            balanceBefore;
    }

    /**
     * @dev Internal function that handles token transfer to the recipient
     * @dev If the destination eid is the same as the current eid, it transfers the tokens directly to the recipient
     * @dev If the destination eid is different, it sends a LayerZero cross-chain transaction
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function _sendOft(
        address _oft,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal {
        // solhint-disable-next-line check-send-result
        IOFT(_oft).send{value: msg.value}(
            _sendParam,
            MessagingFee(msg.value, 0),
            _refundAddress
        );
    }

    /**
     * @dev Internal function to refund input tokens to sender on source during a failed transaction
     * @param _oft The OFT contract address used for refunding
     * @param _message The original message that was sent
     * @param _amount The amount of tokens to refund
     * @param _refundAddress Address to receive the refund
     */
    function _refund(
        address _oft,
        bytes calldata _message,
        uint256 _amount,
        address _refundAddress
    ) internal {
        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        _sendOft(_oft, refundSendParam, _refundAddress);
    }

    /**
     * @dev Internal function to revert if msg.value is not 0
     */
    function _requireNoValue() internal view {
        if (msg.value > 0) {
            revert NoMsgValueExpected();
        }
    }

    /**
     * @dev Internal function to parse the extra options
     * @param _extraOptions The extra options for the deposit operation
     * @return referrerId The referrer id
     */
    function _parseDepositExtraOptions(bytes memory _extraOptions)
        internal
        pure
        returns (bytes32 referrerId)
    {
        if (_extraOptions.length > 0) {
            // solhint-disable-next-line no-inline-assembly
            assembly {
                referrerId := mload(add(_extraOptions, 32))
            }
        }
    }

    /**
     * @dev Internal function to get the balance of the token of the contract
     * @param _token the address of the token
     * @param _of the address of the account
     * @return balance The balance of the token of the contract
     */
    function _balanceOf(address _token, address _of)
        internal
        view
        returns (uint256)
    {
        return IERC20(_token).balanceOf(_of);
    }

    /**
     * @dev Internal function to convert a token amount to base18
     * @param amount The amount of the token
     * @return The amount in base18
     */
    function _tokenAmountToBase18(uint256 amount)
        internal
        view
        returns (uint256)
    {
        return amount.convertToBase18(paymentTokenDecimals);
    }

    receive() external payable {}
}
