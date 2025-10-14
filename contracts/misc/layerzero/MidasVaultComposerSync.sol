// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {IOFT, SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {IOAppCore} from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import {ILayerZeroEndpointV2} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {OFTComposeMsgCodec} from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import {IVaultComposerSync} from "@layerzerolabs/ovault-evm/contracts/interfaces/IVaultComposerSync.sol";
import {IDepositVault} from "../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../interfaces/IRedemptionVault.sol";
import {IDataFeed} from "../../interfaces/IDataFeed.sol";
import {TokenConfig, IManageableVault} from "../../interfaces/IManageableVault.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {DecimalsCorrectionLibrary} from "../../libraries/DecimalsCorrectionLibrary.sol";

/**
 * @dev extended IManageableVault interface to include methods from
 * default ManageableVault implementation
 */
interface IManageableVaultWithConfigs is IManageableVault {
    function tokensConfig(
        address token
    ) external view returns (TokenConfig memory);

    function waivedFeeRestriction(address account) external view returns (bool);

    function instantFee() external view returns (uint256);
}

/**
 * @title MidasVaultComposerSync - Synchronous Vault Composer for Midas vaults
 * @notice This contract is a composer that allows deposits and redemptions operations against a
 *         synchronous vault across different chains using LayerZero's OFT protocol.
 * @dev The contract is designed to handle deposits and redemptions of vault shares and assets,
 *      ensuring that the share and asset tokens are correctly managed and transferred across chains.
 *      It also includes slippage protection and refund mechanisms for failed transactions.
 * @dev Default refunds are enabled to EOA addresses only on the source.
        Custom refunds to contracts can be implemented by overriding the _refund function.
 */
contract MidasVaultComposerSync is IVaultComposerSync, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;
    using DecimalsCorrectionLibrary for uint256;

    error VaultsConfigAddressMismatch(address dvValue, address rvValue);
    error TokenAddressMismatch(
        address oftTokenValue,
        address dvValue,
        address rvValue
    );
    error NotImplemented();
    error InvalidTokenRate(address feed);

    IDepositVault public immutable DEPOSIT_VAULT;
    IRedemptionVault public immutable REDEMPTION_VAULT;
    IDataFeed public immutable M_TOKEN_DATA_FEED;

    address public immutable ASSET_OFT;
    address public immutable ASSET_ERC20;
    address public immutable SHARE_OFT;
    address public immutable SHARE_ERC20;

    uint8 public immutable ASSET_ERC20_DECIMALS;

    address public immutable ENDPOINT;
    uint32 public immutable VAULT_EID;

    uint256 private constant _ONE = 1e18;
    uint256 private constant _STABLECOIN_RATE = _ONE;
    uint256 private constant _ONE_HUNDRED_PERCENT = 100 * 100;

    /**
     * @notice Initializes the VaultComposerSync contract with vault and OFT token addresses
     * @param _depositVault The address of the deposit vault contract
     * @param _redemptionVault The address of the redemption vault contract
     * @param _assetOFT The address of the asset OFT contract
     * @param _shareOFT The address of the share OFT contract
     *
     * Requirements:
     * - Share token must be the vault itself
     * - Asset token must match the vault's underlying asset
     * - Share OFT must be an adapter (approvalRequired() returns true)
     */
    constructor(
        address _depositVault,
        address _redemptionVault,
        address _assetOFT,
        address _shareOFT
    ) {
        DEPOSIT_VAULT = IDepositVault(_depositVault);
        REDEMPTION_VAULT = IRedemptionVault(_redemptionVault);

        M_TOKEN_DATA_FEED = DEPOSIT_VAULT.mTokenDataFeed();

        {
            IDataFeed mTokenDataFeedRv = REDEMPTION_VAULT.mTokenDataFeed();

            if (mTokenDataFeedRv != M_TOKEN_DATA_FEED) {
                revert VaultsConfigAddressMismatch(
                    address(mTokenDataFeedRv),
                    address(M_TOKEN_DATA_FEED)
                );
            }
        }

        ASSET_OFT = _assetOFT;
        ASSET_ERC20 = IOFT(ASSET_OFT).token();
        ASSET_ERC20_DECIMALS = IERC20Metadata(ASSET_ERC20).decimals();

        SHARE_OFT = _shareOFT;
        SHARE_ERC20 = IOFT(SHARE_OFT).token();

        {
            address mTokenDv = address(DEPOSIT_VAULT.mToken());
            address mTokenRv = address(REDEMPTION_VAULT.mToken());
            if (SHARE_ERC20 != mTokenDv || SHARE_ERC20 != mTokenRv) {
                revert TokenAddressMismatch(SHARE_ERC20, mTokenDv, mTokenRv);
            }
        }

        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());
        VAULT_EID = ILayerZeroEndpointV2(ENDPOINT).eid();

        /// @dev Approve the vault to spend the asset tokens held by this contract
        IERC20(ASSET_ERC20).approve(_depositVault, type(uint256).max);
        IERC20(SHARE_ERC20).approve(_redemptionVault, type(uint256).max);
        IERC20(SHARE_ERC20).approve(SHARE_OFT, type(uint256).max);

        /// @dev If the asset OFT is an adapter, approve it as well
        if (IOFT(_assetOFT).approvalRequired()) {
            IERC20(ASSET_ERC20).approve(_assetOFT, type(uint256).max);
        }
    }

    /**
     * @notice Handles LayerZero compose operations for vault transactions with automatic refund functionality
     * @dev This composer is designed to handle refunds to an EOA address and not a contract
     * @dev Any revert in handleCompose() causes a refund back to the src EXCEPT for InsufficientMsgValue
     * @param _composeSender The OFT contract address used for refunds, must be either ASSET_OFT or SHARE_OFT
     * @param _guid LayerZero's unique tx id (created on the source tx)
     * @param _message Decomposable bytes object into [composeHeader][composeMessage]
     */
    function lzCompose(
        address _composeSender, // The OFT used on refund, also the vaultIn token.
        bytes32 _guid,
        bytes calldata _message, // expected to contain a composeMessage = abi.encode(SendParam hopSendParam,uint256 minMsgValue)
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        if (msg.sender != ENDPOINT) {
            revert OnlyEndpoint(msg.sender);
        }
        if (_composeSender != ASSET_OFT && _composeSender != SHARE_OFT) {
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
    ) external payable {
        /// @dev Can only be called by self
        if (msg.sender != address(this)) {
            revert OnlySelf(msg.sender);
        }

        /// @dev SendParam defines how the composer will handle the user's funds
        /// @dev The minMsgValue is the minimum amount of msg.value that must be sent, failing to do so will revert and the transaction will be retained in the endpoint for future retries
        (SendParam memory sendParam, uint256 minMsgValue) = abi.decode(
            _composeMsg,
            (SendParam, uint256)
        );
        if (msg.value < minMsgValue) {
            revert InsufficientMsgValue(minMsgValue, msg.value);
        }

        if (_oftIn == ASSET_OFT) {
            _depositAndSend(_composeFrom, _amount, sendParam, tx.origin);
        } else {
            _redeemAndSend(_composeFrom, _amount, sendParam, tx.origin);
        }
    }

    /**
     * @notice Deposits ERC20 assets from the caller into the vault and sends them to the recipient
     * @param _assetAmount The number of ERC20 tokens to deposit and send
     * @param _sendParam Parameters on how to send the shares to the recipient
     * @param _refundAddress Address to receive excess `msg.value`
     */
    function depositAndSend(
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(ASSET_ERC20).safeTransferFrom(
            msg.sender,
            address(this),
            _assetAmount
        );
        _depositAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _assetAmount,
            _sendParam,
            _refundAddress
        );
    }

    /**
     * @dev Internal function that deposits assets and sends shares to another chain
     * @param _depositor The depositor (bytes32 format to account for non-evm addresses)
     * @param _assetAmount The number of assets to deposit
     * @param _sendParam Parameter that defines how to send the shares
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first deposits the assets to mint shares, validates the shares meet minimum slippage requirements,
     *         then sends the minted shares cross-chain using the OFT (Omnichain Fungible Token) protocol
     * @notice The _sendParam.amountLD is updated to the actual share amount minted, and minAmountLD is reset to 0 for the send operation
     */
    function _depositAndSend(
        bytes32 _depositor,
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 shareAmount = _deposit(
            _depositor,
            _assetAmount,
            _sendParam.minAmountLD
        );

        _sendParam.amountLD = shareAmount;
        _sendParam.minAmountLD = 0;

        _send(SHARE_OFT, _sendParam, _refundAddress);
        emit Deposited(
            _depositor,
            _sendParam.to,
            _sendParam.dstEid,
            _assetAmount,
            shareAmount
        );
    }

    /**
     * @dev Internal function to deposit assets into the vault
     * @param _assetAmount The number of assets to deposit into the vault
     * @return shareAmount The number of shares received from the vault deposit
     * @notice This function is expected to be overridden by the inheriting contract to implement custom/nonERC4626 deposit logic
     */
    function _deposit(
        bytes32 /*_depositor*/,
        uint256 _assetAmount,
        uint256 _minReceiveAmount
    ) internal virtual returns (uint256 shareAmount) {
        uint256 balanceBefore = _balanceOfThis(SHARE_ERC20);
        DEPOSIT_VAULT.depositInstant(
            ASSET_ERC20,
            tokenAmountToBase18(_assetAmount),
            _minReceiveAmount,
            bytes32(0) // referrerId
        );

        shareAmount = _balanceOfThis(SHARE_ERC20) - balanceBefore;
    }

    /**
     * @notice Redeems vault shares and sends the resulting assets to the user
     * @param _shareAmount The number of vault shares to redeem
     * @param _sendParam Parameter that defines how to send the assets
     * @param _refundAddress Address to receive excess payment of the LZ fees
     */
    function redeemAndSend(
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(SHARE_ERC20).safeTransferFrom(
            msg.sender,
            address(this),
            _shareAmount
        );
        _redeemAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _shareAmount,
            _sendParam,
            _refundAddress
        );
    }

    /**
     * @dev Internal function that redeems shares for assets and sends them cross-chain
     * @param _redeemer The address of the redeemer in bytes32 format
     * @param _shareAmount The number of shares to redeem
     * @param _sendParam Parameter that defines how to send the assets
     * @param _refundAddress Address to receive excess payment of the LZ fees
     * @notice This function first redeems the specified share amount for the underlying asset,
     *         validates the received amount against slippage protection, then initiates a cross-chain
     *         transfer of the redeemed assets using the OFT (Omnichain Fungible Token) protocol
     * @notice The minAmountLD in _sendParam is reset to 0 after slippage validation since the
     *         actual amount has already been verified
     */
    function _redeemAndSend(
        bytes32 _redeemer,
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 assetAmount = _redeem(
            _redeemer,
            _shareAmount,
            _sendParam.minAmountLD
        );

        _sendParam.amountLD = assetAmount;
        _sendParam.minAmountLD = 0;

        _send(ASSET_OFT, _sendParam, _refundAddress);
        emit Redeemed(
            _redeemer,
            _sendParam.to,
            _sendParam.dstEid,
            _shareAmount,
            assetAmount
        );
    }

    /**
     * @dev Internal function to redeem shares from the vault
     * @param _shareAmount The number of shares to redeem from the vault
     * @return assetAmount The number of assets received from the vault redemption
     * @notice This function is expected to be overridden by the inheriting contract to implement custom/nonERC4626 redemption logic
     */
    function _redeem(
        bytes32 /*_redeemer*/,
        uint256 _shareAmount,
        uint256 _minReceiveAmount
    ) internal virtual returns (uint256 assetAmount) {
        uint256 balanceBefore = _balanceOfThis(ASSET_ERC20);
        REDEMPTION_VAULT.redeemInstant(
            ASSET_ERC20,
            _shareAmount,
            _minReceiveAmount
        );

        assetAmount = _balanceOfThis(ASSET_ERC20) - balanceBefore; // TODO: move balance calc to function
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
        address /* _from */,
        address _targetOFT,
        uint256 _vaultInAmount,
        SendParam memory _sendParam
    ) external view virtual returns (MessagingFee memory) {
        /// @dev When quoting the asset OFT, the function input is shares and the SendParam.amountLD into quoteSend() should be assets (and vice versa)

        if (_targetOFT == ASSET_OFT) {
            _sendParam.amountLD = _previewRedeem(_vaultInAmount);
        } else {
            _sendParam.amountLD = _previewDeposit(_vaultInAmount);
        }
        return IOFT(_targetOFT).quoteSend(_sendParam, false);
    }

    /**
     * @dev for Midas vaults this function is not implemented
     * as mint and redeem flows are split between 2 different contracts
     */
    function VAULT() external pure returns (IERC4626) {
        revert NotImplemented();
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
        if (_sendParam.dstEid == VAULT_EID) {
            /// @dev Can do this because _oft is validated before this function is called
            address erc20 = _oft == ASSET_OFT ? ASSET_ERC20 : SHARE_ERC20;

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

    function _previewDeposit(
        uint256 amountTokenIn
    ) internal view returns (uint256) {
        uint256 amountTokenInBase18 = tokenAmountToBase18(amountTokenIn);

        TokenConfig memory tokenConfig = IManageableVaultWithConfigs(
            address(DEPOSIT_VAULT)
        ).tokensConfig(ASSET_ERC20);

        uint256 tokenInRate = getTokenRate(
            IDataFeed(tokenConfig.dataFeed),
            tokenConfig.stable
        );
        if (tokenInRate == 0) {
            revert InvalidTokenRate(tokenConfig.dataFeed);
        }

        uint256 mTokenRate = getTokenRate(M_TOKEN_DATA_FEED, false);
        if (mTokenRate == 0) {
            revert InvalidTokenRate(address(M_TOKEN_DATA_FEED));
        }

        uint256 amountInUsd = (amountTokenInBase18 * tokenInRate) / _ONE;

        uint256 feeTokenAmount = _truncate(
            _getFeeAmount(
                address(DEPOSIT_VAULT),
                tokenConfig,
                amountTokenInBase18
            ),
            ASSET_ERC20_DECIMALS
        );

        uint256 feeInUsd = (feeTokenAmount * tokenInRate) / _ONE;
        uint256 amountInUsdWithoutFee = amountInUsd - feeInUsd;

        uint256 amountMToken = (amountInUsdWithoutFee * (_ONE)) / mTokenRate;

        return amountMToken;
    }

    function _previewRedeem(
        uint256 amountMTokenIn
    ) internal view returns (uint256 amountTokenOut) {
        TokenConfig memory tokenConfig = IManageableVaultWithConfigs(
            address(REDEMPTION_VAULT)
        ).tokensConfig(ASSET_ERC20);

        uint256 mTokenRate = getTokenRate(M_TOKEN_DATA_FEED, false);

        if (mTokenRate == 0) {
            revert InvalidTokenRate(address(M_TOKEN_DATA_FEED));
        }

        uint256 tokenOutRate = getTokenRate(
            IDataFeed(tokenConfig.dataFeed),
            tokenConfig.stable
        );

        if (tokenOutRate == 0) {
            revert InvalidTokenRate(tokenConfig.dataFeed);
        }

        uint256 feeAmount = _getFeeAmount(
            address(REDEMPTION_VAULT),
            tokenConfig,
            amountMTokenIn
        );

        uint256 amountMTokenWithoutFee = amountMTokenIn - feeAmount;

        amountTokenOut = ((amountMTokenWithoutFee * mTokenRate) / tokenOutRate)
            .convertFromBase18(ASSET_ERC20_DECIMALS);
    }

    function getTokenRate(
        IDataFeed dataFeed,
        bool stable
    ) internal view returns (uint256) {
        uint256 rate = dataFeed.getDataInBase18();
        if (stable) {
            return _STABLECOIN_RATE;
        }
        return rate;
    }

    function tokenAmountToBase18(
        uint256 amount
    ) internal view returns (uint256) {
        return amount.convertToBase18(ASSET_ERC20_DECIMALS);
    }

    function _truncate(
        uint256 value,
        uint8 decimals
    ) private pure returns (uint256) {
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
