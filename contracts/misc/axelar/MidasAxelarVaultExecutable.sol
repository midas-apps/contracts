// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {InterchainTokenExecutable} from "@axelar-network/interchain-token-service/contracts/executable/InterchainTokenExecutable.sol";
import {IInterchainTokenService} from "@axelar-network/interchain-token-service/contracts/interfaces/IInterchainTokenService.sol";

import {SafeERC20Upgradeable as SafeERC20, IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IDepositVault} from "../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../interfaces/IRedemptionVault.sol";
import {IDataFeed} from "../../interfaces/IDataFeed.sol";
import {TokenConfig, IManageableVault} from "../../interfaces/IManageableVault.sol";
import {DecimalsCorrectionLibrary} from "../../libraries/DecimalsCorrectionLibrary.sol";
import {MidasInitializable} from "../../abstract/MidasInitializable.sol";
import {IMidasAxelarVaultExecutable} from "./interfaces/IMidasAxelarVaultExecutable.sol";

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
 * @title MidasAxelarVaultExecutable - Synchronous Vault Composer for Midas vaults
 * @notice This contract is a InterchainTokenExecutable contract that allows deposits and redemptions operations against a
 *         synchronous vault across different chains using Axelar's ITS protocol.
 * @dev The contract is designed to handle deposits and redemptions of vault mTokens and paymentTokens,
 *      ensuring that the mToken and paymentToken are correctly managed and transferred across chains.
 *      It also includes slippage protection and refund mechanisms for failed transactions.
 */
contract MidasAxelarVaultExecutable is
    InterchainTokenExecutable,
    IMidasAxelarVaultExecutable,
    MidasInitializable,
    ReentrancyGuardUpgradeable
{
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
     * @param itsTokenValue address of ITS token
     * @param dvValue address of mToken of deposit vault
     * @param rvValue address of mToken of redemption vault
     */
    error TokenAddressMismatch(
        address itsTokenValue,
        address dvValue,
        address rvValue
    );

    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    IDepositVault public immutable depositVault;
    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    IRedemptionVault public immutable redemptionVault;
    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    IDataFeed public immutable mTokenDataFeed;

    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    bytes32 public immutable paymentTokenId;
    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    address public immutable paymentTokenErc20;
    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    bytes32 public immutable mTokenId;
    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    address public immutable mTokenErc20;

    /**
     * @notice decimals of `paymentTokenErc20`
     */
    uint8 public immutable paymentTokenDecimals;

    /**
     * @notice hash of the current chain name
     */
    bytes32 public immutable chainNameHash;

    /**
     * @notice constant for 1e18
     */
    uint256 private constant _ONE = 1e18;
    /**
     * @notice constant for 100%
     */
    uint256 private constant _ONE_HUNDRED_PERCENT = 100 * 100;

    /**
     * @notice constructor
     * @param _depositVault address of the deposit vault
     * @param _redemptionVault address of the redemption vault
     * @param _paymentTokenId ITS id of the payment token
     * @param _mTokenId ITS id of the m token
     * @param _interchainTokenService address of the interchain token service
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _depositVault,
        address _redemptionVault,
        bytes32 _paymentTokenId,
        bytes32 _mTokenId,
        address _interchainTokenService
    ) MidasInitializable() InterchainTokenExecutable(_interchainTokenService) {
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

        chainNameHash = IInterchainTokenService(_interchainTokenService)
            .chainNameHash();

        paymentTokenId = _paymentTokenId;
        paymentTokenErc20 = IInterchainTokenService(_interchainTokenService)
            .registeredTokenAddress(_paymentTokenId);
        paymentTokenDecimals = IERC20Metadata(paymentTokenErc20).decimals();

        mTokenId = _mTokenId;
        mTokenErc20 = IInterchainTokenService(_interchainTokenService)
            .registeredTokenAddress(_mTokenId);

        {
            address mTokenDv = address(depositVault.mToken());
            address mTokenRv = address(redemptionVault.mToken());
            if (mTokenErc20 != mTokenDv || mTokenErc20 != mTokenRv) {
                revert TokenAddressMismatch(mTokenErc20, mTokenDv, mTokenRv);
            }
        }
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

        IERC20(paymentTokenErc20).approve(
            interchainTokenService,
            type(uint256).max
        );
    }

    /**
     * @notice internal function to execute the interchain token transfer
     * @param commandId the commandId of the operation
     * @param sourceChain the source chain of the operation
     * @param sourceAddress the source address of the operation
     * @param data the data of the operation
     * @param tokenId the ITS tokenId of the operation
     * @param amount the amount of the operation
     */
    function _executeWithInterchainToken(
        bytes32 commandId,
        string calldata sourceChain,
        bytes calldata sourceAddress,
        bytes calldata data,
        bytes32 tokenId,
        address, /*token*/
        uint256 amount
    ) internal override {
        if (tokenId != paymentTokenId && tokenId != mTokenId) {
            revert OnlyValidExecutableTokenId(tokenId);
        }

        /// @dev if it fails we refund the user
        try
            this.handleExecuteWithInterchainToken(
                sourceAddress,
                data,
                tokenId,
                amount
            )
        {
            emit Sent(commandId);
        } catch (bytes memory _err) {
            _itsTransfer(sourceChain, sourceAddress, tokenId, amount);

            emit Refunded(commandId, _err);
        }
    }

    /**
     * @notice internal function to execute the interchain token transfer
     * @param _sourceAddress the source address of the operation
     * @param _data the data of the operation
     * @param _tokenId the ITS tokenId of the operation
     * @param _amount the amount of the operation
     */
    function handleExecuteWithInterchainToken(
        bytes calldata _sourceAddress,
        bytes calldata _data,
        bytes32 _tokenId,
        uint256 _amount
    ) public virtual {
        /// @dev Can only be called by self
        if (msg.sender != address(this)) {
            revert OnlySelf(msg.sender);
        }

        if (_tokenId == paymentTokenId) {
            _depositAndSend(_sourceAddress, _amount, _data);
        } else {
            _redeemAndSend(_sourceAddress, _amount, _data);
        }
    }

    /**
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    function depositAndSend(uint256 _paymentTokenAmount, bytes calldata _data)
        external
        payable
        virtual
        nonReentrant
    {
        IERC20(paymentTokenErc20).safeTransferFrom(
            msg.sender,
            address(this),
            _paymentTokenAmount
        );
        _depositAndSend(
            abi.encodePacked(msg.sender),
            _paymentTokenAmount,
            _data
        );
    }

    /**
     * @notice internal function to deposit and send the paymentToken to the destination chain
     * @param _depositor the depositor of the operation
     * @param _paymentTokenAmount the amount of payment tokens to deposit
     * @param _data the data of the operation
     */
    function _depositAndSend(
        bytes memory _depositor,
        uint256 _paymentTokenAmount,
        bytes calldata _data
    ) internal virtual {
        (
            bytes memory receiver,
            uint256 minReceiveAmount,
            bytes32 referrerId,
            string memory receiverChainName
        ) = abi.decode(_data, (bytes, uint256, bytes32, string));

        bool receiveToSameNetwork = chainNameHash ==
            _getChainNameHash(receiverChainName);

        uint256 mTokenAmount = _deposit(
            receiveToSameNetwork ? _bytesToAddress(receiver) : address(this),
            _paymentTokenAmount,
            minReceiveAmount,
            referrerId
        );

        if (!receiveToSameNetwork) {
            _itsTransfer(receiverChainName, receiver, mTokenId, mTokenAmount);
        }
        emit Deposited(
            _depositor,
            receiver,
            receiverChainName,
            _paymentTokenAmount,
            mTokenAmount
        );
    }

    /**
     * @notice internal function to get the chain name hash
     * @param _chainName the chain name
     * @return the chain name hash
     */
    function _getChainNameHash(string memory _chainName)
        private
        pure
        returns (bytes32)
    {
        return keccak256(bytes(_chainName));
    }

    /**
     * @notice function to deposit into Midas vault
     * @param _receiver the address to receive the mTokens
     * @param _paymentTokenAmount the amount of paymentToken to deposit
     * @param _minReceiveAmount the minimum amount of mTokens to receive
     * @param _referrerId the referrer id for the user
     * @return mTokenAmount the amount of mTokens received
     */
    function _deposit(
        address _receiver,
        uint256 _paymentTokenAmount,
        uint256 _minReceiveAmount,
        bytes32 _referrerId
    ) internal virtual returns (uint256 mTokenAmount) {
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
     * @inheritdoc IMidasAxelarVaultExecutable
     */
    function redeemAndSend(uint256 _mTokenAmount, bytes calldata _data)
        external
        payable
        virtual
        nonReentrant
    {
        IERC20(mTokenErc20).safeTransferFrom(
            msg.sender,
            address(this),
            _mTokenAmount
        );
        _redeemAndSend(abi.encodePacked(msg.sender), _mTokenAmount, _data);
    }

    /**
     * @notice internal function to redeem and send the mToken to the destination chain
     * @param _redeemer the address of the redeemer
     * @param _mTokenAmount the amount of mTokens to redeem
     * @param _data the data of the operation
     */
    function _redeemAndSend(
        bytes memory _redeemer,
        uint256 _mTokenAmount,
        bytes calldata _data
    ) internal virtual {
        (
            bytes memory receiver,
            uint256 minReceiveAmount,
            string memory receiverChainName
        ) = abi.decode(_data, (bytes, uint256, string));

        bool receiveToSameNetwork = chainNameHash ==
            _getChainNameHash(receiverChainName);

        uint256 paymentTokenAmount = _redeem(
            receiveToSameNetwork ? _bytesToAddress(receiver) : address(this),
            _mTokenAmount,
            minReceiveAmount
        );

        if (!receiveToSameNetwork) {
            _itsTransfer(
                receiverChainName,
                receiver,
                paymentTokenId,
                paymentTokenAmount
            );
        }

        emit Redeemed(
            _redeemer,
            receiver,
            receiverChainName,
            _mTokenAmount,
            paymentTokenAmount
        );
    }

    /**
     * @notice function to redeem from Midas vault
     * @param _receiver the address to receive the paymentToken
     * @param _mTokenAmount the amount of mTokens to redeem
     * @param _minReceiveAmount the minimum amount of paymentToken to receive
     * @return paymentTokenAmount the amount of paymentToken received
     */
    function _redeem(
        address _receiver,
        uint256 _mTokenAmount,
        uint256 _minReceiveAmount
    ) internal virtual returns (uint256 paymentTokenAmount) {
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
     * @notice function to get the balance of a token
     * @param _token the address of the token
     * @param _of the address of the account
     * @return the balance of the token
     */
    function _balanceOf(address _token, address _of)
        internal
        view
        returns (uint256)
    {
        return IERC20(_token).balanceOf(_of);
    }

    /**
     * @notice internal function to transfer the token using ITS
     * @param destinationChain the destination chain
     * @param destinationAddress the destination address
     * @param tokenId the ITS tokenId
     * @param amount the amount of the token
     */
    function _itsTransfer(
        string memory destinationChain,
        bytes memory destinationAddress,
        bytes32 tokenId,
        uint256 amount
    ) internal {
        return
            IInterchainTokenService(interchainTokenService).interchainTransfer(
                tokenId,
                destinationChain,
                destinationAddress,
                amount
            );
    }

    /**
     * @notice internal function to convert a bytes to an address
     * @param b bytes value encode using `abi.encodePacked(address)`
     * @return addr the address
     */
    function _bytesToAddress(bytes memory b)
        internal
        pure
        returns (address addr)
    {
        assembly {
            addr := mload(add(b, 20))
        }
    }

    /**
     * @notice internal function to convert a token amount to base18
     * @param amount the amount of the token
     * @return the amount in base18
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
