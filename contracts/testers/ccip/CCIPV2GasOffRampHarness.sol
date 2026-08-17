// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MessageV1Codec} from "@chainlink/contracts-ccip/contracts/libraries/MessageV1Codec.sol";
import {OffRamp} from "@chainlink/contracts-ccip/contracts/offRamp/OffRamp.sol";
import {OffRampHelper} from "@chainlink/contracts-ccip/contracts/test/helpers/OffRampHelper.sol";

/**
 * @title CCIPV2GasOffRampHarness
 * @notice Test-only OffRamp for measuring the documented destination token
 * segment: receiver balance check, release-or-mint, and receiver balance check.
 * @author RedDuck Software
 * @dev The gas-bounded helper models Chainlink's published token-pool service
 * limit. It does not reproduce or claim an onchain per-receipt gas subcall in
 * the production OffRamp.
 */
contract CCIPV2GasOffRampHarness is OffRampHelper {
    /**
     * @notice Creates the test OffRamp with the supplied V2 static config.
     * @param staticConfig Chainlink OffRamp static configuration.
     */
    constructor(OffRamp.StaticConfig memory staticConfig)
        OffRampHelper(staticConfig)
    {}

    /**
     * @notice Measures the documented destination token segment without a
     * preceding pool preflight.
     * @param tokenTransfer Destination token-transfer data.
     * @param originalSender ABI-encoded source-chain sender.
     * @param sourceChainSelector Source chain selector.
     * @param requestedFinalityConfig Requested finality configuration.
     * @return gasUsed Gas consumed by balance-before, release-or-mint, and
     * balance-after handling.
     * @return receiverDelta Actual requested-recipient balance increase.
     */
    function releaseOrMintAndMeasure(
        MessageV1Codec.TokenTransferV1 memory tokenTransfer,
        bytes memory originalSender,
        uint64 sourceChainSelector,
        bytes4 requestedFinalityConfig
    ) external returns (uint256 gasUsed, uint256 receiverDelta) {
        address receiver = address(bytes20(tokenTransfer.tokenReceiver));
        address token = address(bytes20(tokenTransfer.destTokenAddress));

        uint256 gasBefore = gasleft();
        uint256 balanceBefore = _getBalanceOfReceiver(receiver, token);
        _releaseOrMintSingleToken(
            tokenTransfer,
            originalSender,
            sourceChainSelector,
            requestedFinalityConfig
        );
        uint256 balanceAfter = _getBalanceOfReceiver(receiver, token);

        gasUsed = gasBefore - gasleft();
        receiverDelta = balanceAfter - balanceBefore;
    }

    /**
     * @notice Measures the destination token segment after querying the pool's
     * required CCVs, matching the pool preflight performed by V2 execution.
     * @dev The preflight is intentionally outside the measured gas window. Its
     * purpose is only to reproduce the registry, pool, and storage warming that
     * precedes `_releaseOrMintSingleToken` in `OffRamp.executeSingleMessage`.
     * @param tokenTransfer Destination token-transfer data.
     * @param originalSender ABI-encoded source-chain sender.
     * @param sourceChainSelector Source chain selector.
     * @param requestedFinalityConfig Requested finality configuration.
     * @return gasUsed Gas consumed by balance-before, release-or-mint, and
     * balance-after handling.
     * @return receiverDelta Actual requested-recipient balance increase.
     */
    function releaseOrMintAfterPoolPreflightAndMeasure(
        MessageV1Codec.TokenTransferV1 memory tokenTransfer,
        bytes memory originalSender,
        uint64 sourceChainSelector,
        bytes4 requestedFinalityConfig
    ) external returns (uint256 gasUsed, uint256 receiverDelta) {
        _getCCVsFromPool(
            address(bytes20(tokenTransfer.destTokenAddress)),
            sourceChainSelector,
            tokenTransfer.amount,
            requestedFinalityConfig,
            tokenTransfer.extraData
        );

        return
            this.releaseOrMintAndMeasure(
                tokenTransfer,
                originalSender,
                sourceChainSelector,
                requestedFinalityConfig
            );
    }

    /**
     * @notice Executes the preflight-warmed destination token segment within a
     * fixed test gas budget.
     * @dev Pool preflight is intentionally completed before the bounded
     * self-call. A failed bounded call is caught so tests can prove that all
     * token and recovery state rolled back atomically.
     * @param tokenTransfer Destination token-transfer data.
     * @param originalSender ABI-encoded source-chain sender.
     * @param sourceChainSelector Source chain selector.
     * @param requestedFinalityConfig Requested finality configuration.
     * @param gasBudget Gas forwarded to the measured three-call segment.
     * @return success Whether the bounded token segment completed.
     * @return gasUsed Measured segment gas on success, or bounded-call gas
     * consumed on failure.
     * @return receiverDelta Actual requested-recipient balance increase on
     * success.
     * @return error Raw bounded-call revert data on failure.
     */
    function releaseOrMintWithGasBudget(
        MessageV1Codec.TokenTransferV1 memory tokenTransfer,
        bytes memory originalSender,
        uint64 sourceChainSelector,
        bytes4 requestedFinalityConfig,
        uint256 gasBudget
    )
        external
        returns (
            bool success,
            uint256 gasUsed,
            uint256 receiverDelta,
            bytes memory error
        )
    {
        _getCCVsFromPool(
            address(bytes20(tokenTransfer.destTokenAddress)),
            sourceChainSelector,
            tokenTransfer.amount,
            requestedFinalityConfig,
            tokenTransfer.extraData
        );

        uint256 gasBefore = gasleft();
        bytes memory returnData;
        (success, returnData) = address(this).call{gas: gasBudget}(
            abi.encodeCall(
                this.releaseOrMintAndMeasure,
                (
                    tokenTransfer,
                    originalSender,
                    sourceChainSelector,
                    requestedFinalityConfig
                )
            )
        );
        gasUsed = gasBefore - gasleft();

        if (success) {
            (gasUsed, receiverDelta) = abi.decode(
                returnData,
                (uint256, uint256)
            );
        } else {
            error = returnData;
        }
    }
}
