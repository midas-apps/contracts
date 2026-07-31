// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice Minimal IRouterClient mock for unit-testing escrow claimToRemote.
 * @dev Pulls feeToken/native fee and tokenAmounts from the sender; does not
 * route messages cross-chain.
 */
contract CCIPRouterClientMock is IRouterClient {
    using SafeERC20 for IERC20;

    uint256 private _fee;
    bytes32 private _nextMessageId = keccak256("ccip-mock-message");

    event CcipSend(
        uint64 destinationChainSelector,
        address feeToken,
        uint256 feeAmount,
        address token,
        uint256 tokenAmount,
        bytes receiver
    );

    function setFee(uint256 feeAmount) external {
        _fee = feeAmount;
    }

    function setNextMessageId(bytes32 messageId) external {
        _nextMessageId = messageId;
    }

    function isChainSupported(uint64) external pure returns (bool) {
        return true;
    }

    function getFee(uint64, Client.EVM2AnyMessage memory)
        external
        view
        returns (uint256)
    {
        return _fee;
    }

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32) {
        uint256 feeAmount = _fee;
        if (message.feeToken == address(0)) {
            if (msg.value < feeAmount) revert InsufficientFeeTokenAmount();
        } else {
            if (msg.value > 0) revert InvalidMsgValue();
            IERC20(message.feeToken).safeTransferFrom(
                msg.sender,
                address(this),
                feeAmount
            );
        }

        address token;
        uint256 tokenAmount;
        if (message.tokenAmounts.length > 0) {
            token = message.tokenAmounts[0].token;
            tokenAmount = message.tokenAmounts[0].amount;
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                tokenAmount
            );
        }

        emit CcipSend(
            destinationChainSelector,
            message.feeToken,
            feeAmount,
            token,
            tokenAmount,
            message.receiver
        );

        return _nextMessageId;
    }
}
