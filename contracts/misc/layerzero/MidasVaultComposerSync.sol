// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {SafeERC20Upgradeable as SafeERC20, IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IOFT, SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {IOAppCore} from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import {ILayerZeroEndpointV2} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import {IDepositVault} from "../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../interfaces/IRedemptionVault.sol";
import {IDataFeed} from "../../interfaces/IDataFeed.sol";
import {TokenConfig, IManageableVault} from "../../interfaces/IManageableVault.sol";
import {DecimalsCorrectionLibrary} from "../../libraries/DecimalsCorrectionLibrary.sol";
import {IMidasVaultComposerSync} from "./interfaces/IMidasVaultComposerSync.sol";
import {MidasInitializable} from "../../abstract/MidasInitializable.sol";

/**
 * @dev extended IManageableVault interface to include methods from
 * default ManageableVault implementation
 */
interface IManageableVaultWithConfigs is IManageableVault {
    function tokensConfig(address token)
        external
        view
        returns (TokenConfig memory);

    function waivedFeeRestriction(address account) external view returns (bool);

    function instantFee() external view returns (uint256);
}

/**
 * @title MidasVaultComposerSync - Synchronous Vault Composer for Midas vaults
 * @notice This contract is a composer that allows deposits and redemptions operations against a
 *         synchronous vault across different chains using LayerZero's OFT protocol.
 * @dev The contract is designed to handle deposits and redemptions of vault mTokens and paymentTokens,
 *      ensuring that the mToken and paymentToken are correctly managed and transferred across chains.
 *      It also includes slippage protection and refund mechanisms for failed transactions.
 * @dev Default refunds are enabled to EOA addresses only on the source.
        Custom refunds to contracts can be implemented by overriding the _refund function.
 */
contract MidasVaultComposerSync is
    IMidasVaultComposerSync,
    MidasInitializable,
    ReentrancyGuardUpgradeable
{
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice error for vaults config address mismatch
     * @param dvValue address of deposit vault
     * @param rvValue address of redemption vault
     */
    error VaultsConfigAddressMismatch(address dvValue, address rvValue);
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
     * @inheritdoc IMidasVaultComposerSync
     */
    IDepositVault public immutable depositVault;
    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    IRedemptionVault public immutable redemptionVault;
    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    IDataFeed public immutable mTokenDataFeed;

    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    address public immutable paymentTokenOft;
    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    address public immutable paymentTokenErc20;
    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    address public immutable mTokenOft;
    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    address public immutable mTokenErc20;

    /**
     * @notice decimals of `paymentTokenErc20`
     */
    uint8 public immutable paymentTokenDecimals;

    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    address public immutable lzEndpoint;
    /**
     * @inheritdoc IMidasVaultComposerSync
     */
    uint32 public immutable vaultsEid;

    /**
     * @notice constant for 1e18
     */
    uint256 private constant _ONE = 1e18;
    /**
     * @notice constant for 100%
     */
    uint256 private constant _ONE_HUNDRED_PERCENT = 100 * 100;

    /**
     * @notice Initializes the VaultComposerSync contract with vault and OFT token addresses
     * @param _depositVault The address of the deposit vault contract
     * @param _redemptionVault The address of the redemption vault contract
     * @param _paymentTokenOft The address of the paymentToken OFT contract
     * @param _mTokenOft The address of the mToken OFT contract
     *
     * Requirements:
     * - mToken must be the vault itself
     * - paymentToken must match the vault's underlying paymentToken
     * - mToken OFT must be an adapter (approvalRequired() returns true)
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

        mTokenDataFeed = depositVault.mTokenDataFeed();

        {
            IDataFeed mTokenDataFeedRv = redemptionVault.mTokenDataFeed();

            if (mTokenDataFeedRv != mTokenDataFeed) {
                revert VaultsConfigAddressMismatch(
                    address(mTokenDataFeedRv),
                    address(mTokenDataFeed)
                );
            }
        }

        paymentTokenOft = _paymentTokenOft;
        paymentTokenErc20 = IOFT(paymentTokenOft).token();
        paymentTokenDecimals = IERC20Metadata(paymentTokenErc20).decimals();

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
        vaultsEid = ILayerZeroEndpointV2(lzEndpoint).eid();
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
        bytes calldata _message, // expected to contain a composeMessage = abi.encode(SendParam hopSendParam,uint256 minMsgValue)
        address, /*_executor*/
        bytes calldata /*_extraData*/
    ) external payable virtual override {
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
                assembly {
                    revert(add(32, _err), mload(_err))
                }
            }

            _refund(_composeSender, _message, amount, tx.origin);
            emit Refunded(_guid);
        }
    }

    /**
     * @notice Handles the compose operation for OFT (Omnichain Fungible Token) transactions
     * @dev This function can only be called by the contract itself (self-call restriction)
     *      Decodes the compose message to extract SendParam and minimum message value
     *      Routes to either deposit or redeem flow based on the input OFT token type
     * @param _oftIn The OFT token whose funds have been received in the lzReceive associated with this lzTx
     * @param _composeFrom The bytes32 identifier of the compose sender
     * @param _composeMsg The encoded message containing SendParam and minMsgValue
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
        (SendParam memory sendParam, uint256 minMsgValue) = abi.decode(
            _composeMsg,
            (SendParam, uint256)
        );
        if (msg.value < minMsgValue) {
            revert InsufficientMsgValue(minMsgValue, msg.value);
        }

        if (_oftIn == paymentTokenOft) {
            _depositAndSend(_composeFrom, _amount, sendParam, tx.origin);
        } else {
            _redeemAndSend(_composeFrom, _amount, sendParam, tx.origin);
        }
    }

    /**
     * @notice Deposits ERC20 paymentTokens from the caller into the vault and sends them to the recipient
     * @param _paymentTokenAmount The number of ERC20 tokens to deposit and send
     * @param _sendParam Parameters on how to send the mTokens to the recipient
     * @param _refundAddress Address to receive excess `msg.value`
     */
    function depositAndSend(
        uint256 _paymentTokenAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(paymentTokenErc20).safeTransferFrom(
            msg.sender,
            address(this),
            _paymentTokenAmount
        );
        _depositAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _paymentTokenAmount,
            _sendParam,
            _refundAddress
        );
    }

    /**
     * @dev Internal function that deposits paymentTokens and sends mTokens to another chain
     * @param _depositor The depositor (bytes32 format to account for non-evm addresses)
     * @param _paymentTokenAmount The number of paymentTokens to deposit
     * @param _sendParam Parameter that defines how to send the mTokens
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first deposits the paymentTokens to mint mTokens, validates the mTokens meet minimum slippage requirements,
     *         then sends the minted mTokens cross-chain using the OFT (Omnichain Fungible Token) protocol
     * @notice The _sendParam.amountLD is updated to the actual mToken amount minted, and minAmountLD is reset to 0 for the send operation
     */
    function _depositAndSend(
        bytes32 _depositor,
        uint256 _paymentTokenAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 mTokenAmount = _deposit(
            _depositor,
            _paymentTokenAmount,
            _sendParam.minAmountLD
        );

        _sendParam.amountLD = mTokenAmount;
        _sendParam.minAmountLD = 0;

        _send(mTokenOft, _sendParam, _refundAddress);
        emit Deposited(
            _depositor,
            _sendParam.to,
            _sendParam.dstEid,
            _paymentTokenAmount,
            mTokenAmount
        );
    }

    /**
     * @dev Internal function to deposit paymentTokens into the vault
     * @param _paymentTokenAmount The number of paymentTokens to deposit into the vault
     * @return mTokenAmount The number of mTokens received from the vault deposit
     */
    function _deposit(
        bytes32, /*_depositor*/
        uint256 _paymentTokenAmount,
        uint256 _minReceiveAmount
    ) internal virtual returns (uint256 mTokenAmount) {
        uint256 balanceBefore = _balanceOfThis(mTokenErc20);
        depositVault.depositInstant(
            paymentTokenErc20,
            _tokenAmountToBase18(_paymentTokenAmount),
            _minReceiveAmount,
            bytes32(0) // referrerId
        );

        mTokenAmount = _balanceOfThis(mTokenErc20) - balanceBefore;
    }

    /**
     * @notice Redeems vault mTokens and sends the resulting paymentTokens to the user
     * @param _mTokenAmount The number of vault mTokens to redeem
     * @param _sendParam Parameter that defines how to send the paymentTokens
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function redeemAndSend(
        uint256 _mTokenAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(mTokenErc20).safeTransferFrom(
            msg.sender,
            address(this),
            _mTokenAmount
        );
        _redeemAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _mTokenAmount,
            _sendParam,
            _refundAddress
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
     *         transfer of the redeemed paymentTokens using the OFT (Omnichain Fungible Token) protocol
     * @notice The minAmountLD in _sendParam is reset to 0 after slippage validation since the
     *         actual amount has already been verified
     */
    function _redeemAndSend(
        bytes32 _redeemer,
        uint256 _mTokenAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 paymentTokenAmount = _redeem(
            _redeemer,
            _mTokenAmount,
            _sendParam.minAmountLD
        );

        _sendParam.amountLD = paymentTokenAmount;
        _sendParam.minAmountLD = 0;

        _send(paymentTokenOft, _sendParam, _refundAddress);
        emit Redeemed(
            _redeemer,
            _sendParam.to,
            _sendParam.dstEid,
            _mTokenAmount,
            paymentTokenAmount
        );
    }

    /**
     * @dev Internal function to redeem mTokens from the vault
     * @param _mTokenAmount The number of mTokens to redeem from the vault
     * @return paymentTokenAmount The number of paymentTokens received from the vault redemption
     */
    function _redeem(
        bytes32, /*_redeemer*/
        uint256 _mTokenAmount,
        uint256 _minReceiveAmount
    ) internal virtual returns (uint256 paymentTokenAmount) {
        uint256 balanceBefore = _balanceOfThis(paymentTokenErc20);
        redemptionVault.redeemInstant(
            paymentTokenErc20,
            _mTokenAmount,
            _minReceiveAmount
        );

        paymentTokenAmount = _balanceOfThis(paymentTokenErc20) - balanceBefore; // TODO: move balance calc to function
    }

    /**
     * @dev Internal function to get the balance of the token of the contract
     * @param token the address of the token
     * @return balance The balance of the token of the contract
     */
    function _balanceOfThis(address token) internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Quotes the send operation for the given OFT and SendParam
     * @param _targetOFT The OFT contract address to quote
     * @param _vaultInAmount The amount of tokens to send to the vault
     * @param _sendParam The parameters for the send operation
     * @return MessagingFee The estimated fee for the send operation
     */
    function quoteSend(
        address, /* _from */
        address _targetOFT,
        uint256 _vaultInAmount,
        SendParam memory _sendParam
    ) external view virtual returns (MessagingFee memory) {
        /// @dev When quoting the paymentToken OFT, the function input is mTokens and the SendParam.amountLD into quoteSend() should be paymentTokens (and vice versa)

        if (_targetOFT == paymentTokenOft) {
            _sendParam.amountLD = _previewRedeem(_vaultInAmount);
        } else {
            _sendParam.amountLD = _previewDeposit(_vaultInAmount);
        }
        return IOFT(_targetOFT).quoteSend(_sendParam, false);
    }

    /**
     * @dev Internal function that handles token transfer to the recipient
     * @dev If the destination eid is the same as the current eid, it transfers the tokens directly to the recipient
     * @dev If the destination eid is different, it sends a LayerZero cross-chain transaction
     * @param _oft The OFT contract address to use for sending
     * @param _sendParam The parameters for the send operation
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function _send(
        address _oft,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal {
        if (_sendParam.dstEid == vaultsEid) {
            /// @dev Can do this because _oft is validated before this function is called
            address erc20 = _oft == paymentTokenOft
                ? paymentTokenErc20
                : mTokenErc20;

            if (msg.value > 0) {
                revert NoMsgValueExpected();
            }
            IERC20(erc20).safeTransfer(
                _sendParam.to.bytes32ToAddress(),
                _sendParam.amountLD
            );
        } else {
            // crosschain send
            IOFT(_oft).send{value: msg.value}(
                _sendParam,
                MessagingFee(msg.value, 0),
                _refundAddress
            );
        }
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
    ) internal virtual {
        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        IOFT(_oft).send{value: msg.value}(
            refundSendParam,
            MessagingFee(msg.value, 0),
            _refundAddress
        );
    }

    function _previewDeposit(uint256 amountTokenIn)
        internal
        view
        returns (uint256)
    {
        uint256 amountTokenInBase18 = _tokenAmountToBase18(amountTokenIn);

        TokenConfig memory tokenConfig = IManageableVaultWithConfigs(
            address(depositVault)
        ).tokensConfig(paymentTokenErc20);

        uint256 tokenInRate = _getTokenRate(
            IDataFeed(tokenConfig.dataFeed),
            tokenConfig.stable
        );
        if (tokenInRate == 0) {
            revert InvalidTokenRate(tokenConfig.dataFeed);
        }

        uint256 mTokenRate = _getTokenRate(mTokenDataFeed, false);
        if (mTokenRate == 0) {
            revert InvalidTokenRate(address(mTokenDataFeed));
        }

        uint256 amountInUsd = (amountTokenInBase18 * tokenInRate) / _ONE;

        uint256 feeTokenAmount = _truncate(
            _getFeeAmount(
                address(depositVault),
                tokenConfig,
                amountTokenInBase18
            ),
            paymentTokenDecimals
        );

        uint256 feeInUsd = (feeTokenAmount * tokenInRate) / _ONE;
        uint256 amountInUsdWithoutFee = amountInUsd - feeInUsd;

        uint256 amountMToken = (amountInUsdWithoutFee * (_ONE)) / mTokenRate;

        return amountMToken;
    }

    function _previewRedeem(uint256 amountMTokenIn)
        internal
        view
        returns (uint256 amountTokenOut)
    {
        TokenConfig memory tokenConfig = IManageableVaultWithConfigs(
            address(redemptionVault)
        ).tokensConfig(paymentTokenErc20);

        uint256 mTokenRate = _getTokenRate(mTokenDataFeed, false);

        if (mTokenRate == 0) {
            revert InvalidTokenRate(address(mTokenDataFeed));
        }

        uint256 tokenOutRate = _getTokenRate(
            IDataFeed(tokenConfig.dataFeed),
            tokenConfig.stable
        );

        if (tokenOutRate == 0) {
            revert InvalidTokenRate(tokenConfig.dataFeed);
        }

        uint256 feeAmount = _getFeeAmount(
            address(redemptionVault),
            tokenConfig,
            amountMTokenIn
        );

        uint256 amountMTokenWithoutFee = amountMTokenIn - feeAmount;

        amountTokenOut = ((amountMTokenWithoutFee * mTokenRate) / tokenOutRate)
            .convertFromBase18(paymentTokenDecimals);
    }

    function _getTokenRate(IDataFeed dataFeed, bool stable)
        internal
        view
        returns (uint256)
    {
        uint256 rate = dataFeed.getDataInBase18();
        if (stable) {
            return _ONE;
        }
        return rate;
    }

    function _tokenAmountToBase18(uint256 amount)
        internal
        view
        returns (uint256)
    {
        return amount.convertToBase18(paymentTokenDecimals);
    }

    function _truncate(uint256 value, uint8 decimals)
        private
        pure
        returns (uint256)
    {
        return value.convertFromBase18(decimals).convertToBase18(decimals);
    }

    function _getFeeAmount(
        address vault,
        TokenConfig memory tokenConfig,
        uint256 amount
    ) private view returns (uint256) {
        if (
            IManageableVaultWithConfigs(vault).waivedFeeRestriction(
                address(this)
            )
        ) {
            return 0;
        }

        uint256 feePercent;

        feePercent = tokenConfig.fee;

        feePercent += IManageableVaultWithConfigs(vault).instantFee();

        if (feePercent > _ONE_HUNDRED_PERCENT) {
            feePercent = _ONE_HUNDRED_PERCENT;
        }

        return (amount * feePercent) / _ONE_HUNDRED_PERCENT;
    }

    receive() external payable {}
}
