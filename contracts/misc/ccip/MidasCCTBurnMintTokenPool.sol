// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {ERC165Checker} from "@openzeppelin/contracts@5.3.0/utils/introspection/ERC165Checker.sol";

import {IBurnMintERC20} from "@chainlink/contracts-ccip/contracts/interfaces/IBurnMintERC20.sol";
import {Pool} from "@chainlink/contracts-ccip/contracts/libraries/Pool.sol";
import {BurnMintTokenPool} from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {TokenPool} from "@chainlink/contracts-ccip/contracts/pools/TokenPool.sol";

import {IMToken} from "../../interfaces/IMToken.sol";
import {IMidasCCTFallbackReceiver} from "../../interfaces/ccip/IMidasCCTFallbackReceiver.sol";

/**
 * @title MidasCCTBurnMintTokenPool
 * @notice CCIP 2.0 burn/mint pool for Midas mTokens.
 */
contract MidasCCTBurnMintTokenPool is BurnMintTokenPool {
    /**
     * @notice Recovery escrow used when the requested destination mint fails.
     */
    address public fallbackReceiver;

    event FallbackReceiverSet(
        address indexed oldFallbackReceiver,
        address indexed newFallbackReceiver
    );

    error InvalidFallbackReceiver(address newFallbackReceiver);
    error FallbackReceiverAlreadyConfigured(address fallbackReceiver);
    error FallbackReceiverNotConfigured();
    error InvalidOriginalSender(bytes originalSender);

    constructor(
        IMToken token,
        address rmnProxy,
        address router
    )
        BurnMintTokenPool(
            IBurnMintERC20(address(token)),
            18,
            address(0),
            rmnProxy,
            router
        )
    {}

    /**
     * @notice Links the recovery escrow exactly once.
     */
    function setFallbackReceiver(address newFallbackReceiver)
        external
        onlyOwner
    {
        _setFallbackReceiver(newFallbackReceiver);
    }

    /**
     * @inheritdoc TokenPool
     * @dev This override preserves the complete base V2 amount conversion and
     * validation sequence while retaining the original EVM sender for recovery.
     */
    function releaseOrMint(
        Pool.ReleaseOrMintInV1 calldata releaseOrMintIn,
        bytes4 requestedFinalityConfig
    ) public virtual override returns (Pool.ReleaseOrMintOutV1 memory) {
        uint256 localAmount = _calculateLocalAmount(
            releaseOrMintIn.sourceDenominatedAmount,
            _parseRemoteDecimals(releaseOrMintIn.sourcePoolData)
        );

        _validateReleaseOrMint(
            releaseOrMintIn,
            localAmount,
            requestedFinalityConfig
        );

        _mintOrRecover(
            _decodeEvmSender(releaseOrMintIn.originalSender),
            releaseOrMintIn.receiver,
            localAmount,
            releaseOrMintIn.remoteChainSelector
        );

        emit ReleasedOrMinted({
            remoteChainSelector: releaseOrMintIn.remoteChainSelector,
            token: releaseOrMintIn.localToken,
            sender: msg.sender,
            recipient: releaseOrMintIn.receiver,
            amount: localAmount
        });

        return Pool.ReleaseOrMintOutV1({destinationAmount: localAmount});
    }

    /**
     * @inheritdoc TokenPool
     */
    function _lockOrBurn(uint64, uint256 amount) internal virtual override {
        IMToken(address(i_token)).burn(address(this), amount);
    }

    function _mintOrRecover(
        address originalSender,
        address originalRecipient,
        uint256 amount,
        uint64 originalSourceChainSelector
    ) private {
        if (
            originalRecipient == address(this) ||
            originalRecipient == fallbackReceiver
        ) {
            _mintAndRegisterRecovery(
                originalSender,
                originalRecipient,
                amount,
                originalSourceChainSelector
            );
            return;
        }

        try IMToken(address(i_token)).mint(originalRecipient, amount) {} catch {
            _mintAndRegisterRecovery(
                originalSender,
                originalRecipient,
                amount,
                originalSourceChainSelector
            );
        }
    }

    function _mintAndRegisterRecovery(
        address originalSender,
        address originalRecipient,
        uint256 amount,
        uint64 originalSourceChainSelector
    ) private {
        address receiver = fallbackReceiver;
        if (receiver == address(0)) revert FallbackReceiverNotConfigured();

        IMToken(address(i_token)).mint(receiver, amount);
        IMidasCCTFallbackReceiver(receiver).onFallbackMinted(
            originalSender,
            originalRecipient,
            originalSourceChainSelector,
            amount
        );
    }

    function _decodeEvmSender(bytes calldata originalSender)
        private
        pure
        returns (address sender)
    {
        if (originalSender.length != 32)
            revert InvalidOriginalSender(originalSender);

        uint256 encodedSender;
        assembly ("memory-safe") {
            encodedSender := calldataload(originalSender.offset)
        }

        if (encodedSender >> 160 != 0)
            revert InvalidOriginalSender(originalSender);

        sender = address(uint160(encodedSender));
        if (sender == address(0)) revert InvalidOriginalSender(originalSender);
    }

    function _setFallbackReceiver(address newFallbackReceiver) private {
        if (
            newFallbackReceiver == address(0) ||
            newFallbackReceiver.code.length == 0 ||
            !ERC165Checker.supportsInterface(
                newFallbackReceiver,
                type(IMidasCCTFallbackReceiver).interfaceId
            )
        ) revert InvalidFallbackReceiver(newFallbackReceiver);

        try IMidasCCTFallbackReceiver(newFallbackReceiver).tokenPool() returns (
            address configuredPool
        ) {
            if (configuredPool != address(this))
                revert InvalidFallbackReceiver(newFallbackReceiver);
        } catch {
            revert InvalidFallbackReceiver(newFallbackReceiver);
        }

        if (fallbackReceiver != address(0))
            revert FallbackReceiverAlreadyConfigured(fallbackReceiver);

        fallbackReceiver = newFallbackReceiver;
        emit FallbackReceiverSet(address(0), newFallbackReceiver);
    }
}
