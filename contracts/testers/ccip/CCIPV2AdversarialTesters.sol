// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Client} from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import {IAdvancedPoolHooks} from "@chainlink/contracts-ccip/contracts/interfaces/IAdvancedPoolHooks.sol";
import {IAny2EVMMessageReceiver} from "@chainlink/contracts-ccip/contracts/interfaces/IAny2EVMMessageReceiver.sol";
import {IPoolV2} from "@chainlink/contracts-ccip/contracts/interfaces/IPoolV2.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import {Pool} from "@chainlink/contracts-ccip/contracts/libraries/Pool.sol";
import {IERC20} from "@openzeppelin/contracts@5.3.0/token/ERC20/IERC20.sol";
import {IERC165} from "@openzeppelin/contracts@5.3.0/utils/introspection/IERC165.sol";

import {IMidasCCTFallbackReceiver} from "../../interfaces/ccip/IMidasCCTFallbackReceiver.sol";

contract CCIPV2NoFallbackInterface {}

contract CCIPV2RevertingFallbackReceiverTester is IMidasCCTFallbackReceiver {
    error TokenPoolReadFailed();

    function tokenPool() external pure override returns (address) {
        revert TokenPoolReadFailed();
    }

    function onFallbackMinted(
        address,
        address,
        uint64,
        uint256
    ) external pure override {}

    function supportsInterface(bytes4 interfaceId)
        external
        pure
        returns (bool)
    {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IMidasCCTFallbackReceiver).interfaceId;
    }
}

contract CCIPV2FallbackReceiverTester is IMidasCCTFallbackReceiver {
    error CallbackRejected();

    address public override tokenPool;
    bool public rejectCallback;
    uint256 public callbackCount;

    constructor(address configuredPool, bool reject) {
        tokenPool = configuredPool;
        rejectCallback = reject;
    }

    function setRejectCallback(bool reject) external {
        rejectCallback = reject;
    }

    function onFallbackMinted(
        address,
        address,
        uint64,
        uint256
    ) external override {
        _recordCallback();
    }

    function supportsInterface(bytes4 interfaceId)
        external
        pure
        returns (bool)
    {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IMidasCCTFallbackReceiver).interfaceId;
    }

    function _recordCallback() private {
        if (rejectCallback) revert CallbackRejected();
        ++callbackCount;
    }
}

contract CCIPV2AdvancedPoolHooksTester is IAdvancedPoolHooks {
    error PreflightRejected();
    error PostflightRejected();

    bool public rejectPreflight;
    bool public rejectPostflight;
    uint256 public preflightCalls;
    uint256 public postflightCalls;

    function setRejectPreflight(bool reject) external {
        rejectPreflight = reject;
    }

    function setRejectPostflight(bool reject) external {
        rejectPostflight = reject;
    }

    function preflightCheck(
        Pool.LockOrBurnInV1 calldata,
        bytes4,
        bytes calldata,
        uint256
    ) external {
        if (rejectPreflight) revert PreflightRejected();
        ++preflightCalls;
    }

    function postflightCheck(
        Pool.ReleaseOrMintInV1 calldata,
        uint256,
        bytes4
    ) external {
        if (rejectPostflight) revert PostflightRejected();
        ++postflightCalls;
    }

    function getRequiredCCVs(
        address,
        uint64,
        uint256,
        bytes4,
        bytes calldata,
        IPoolV2.MessageDirection
    ) external pure returns (address[] memory requiredCCVs) {
        return new address[](0);
    }
}

contract CCIPV2RouterCaller {
    function send(
        IRouterClient router,
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32) {
        require(message.tokenAmounts.length == 1, "one token required");
        IERC20 token = IERC20(message.tokenAmounts[0].token);
        require(
            token.approve(address(router), message.tokenAmounts[0].amount),
            "approve failed"
        );
        return
            router.ccipSend{value: msg.value}(
                destinationChainSelector,
                message
            );
    }

    receive() external payable {}
}

contract CCIPV2MessageReceiverTester is IAny2EVMMessageReceiver, IERC165 {
    error ReceiverRejected();

    bool public reject;
    uint256 public callbackCount;

    constructor(bool shouldReject) {
        reject = shouldReject;
    }

    function setReject(bool shouldReject) external {
        reject = shouldReject;
    }

    function ccipReceive(Client.Any2EVMMessage calldata) external {
        if (reject) revert ReceiverRejected();
        ++callbackCount;
    }

    function supportsInterface(bytes4 interfaceId)
        external
        pure
        returns (bool)
    {
        return
            interfaceId == type(IAny2EVMMessageReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}

interface ICCIPV2ReturnEscrowTester {
    function returnToSource(bytes32 recoveryId)
        external
        payable
        returns (bytes32 outboundCcipMessageId);
}

contract CCIPV2EscrowReturnCaller {
    bool public rejectRefund;
    address public reentryTarget;
    bytes public reentryData;
    bool public reentrySucceeded;
    uint256 public refundCallbacks;

    function configureRefund(
        bool reject,
        address target,
        bytes calldata data
    ) external {
        rejectRefund = reject;
        reentryTarget = target;
        reentryData = data;
    }

    function returnToSource(address escrow, bytes32 recoveryId)
        external
        payable
        returns (bytes32)
    {
        return
            ICCIPV2ReturnEscrowTester(escrow).returnToSource{value: msg.value}(
                recoveryId
            );
    }

    receive() external payable {
        ++refundCallbacks;
        if (reentryData.length != 0) {
            (reentrySucceeded, ) = reentryTarget.call(reentryData);
        }
        require(!rejectRefund, "refund rejected");
    }
}

contract CCIPV2ReturnRouterTester is IRouterClient {
    error RouterRejectedAfterPull();
    error IncorrectFee(uint256 supplied, uint256 expected);

    uint256 public fee;
    bool public rejectAfterPull;
    bool public useMessageHashFee;
    bytes32 public lastSendHash;
    bytes32 public constant MESSAGE_ID = keccak256("return-router-message");

    constructor(uint256 initialFee, bool reject) {
        fee = initialFee;
        rejectAfterPull = reject;
    }

    function setFee(uint256 newFee) external {
        fee = newFee;
    }

    function setRejectAfterPull(bool reject) external {
        rejectAfterPull = reject;
    }

    function setUseMessageHashFee(bool enabled) external {
        useMessageHashFee = enabled;
    }

    function hashMessage(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(destinationChainSelector, message));
    }

    function isChainSupported(uint64) external pure returns (bool) {
        return true;
    }

    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) external view returns (uint256) {
        return _fee(destinationChainSelector, message);
    }

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32) {
        uint256 expectedFee = _fee(destinationChainSelector, message);
        if (msg.value != expectedFee)
            revert IncorrectFee(msg.value, expectedFee);
        require(message.tokenAmounts.length == 1, "one token required");
        lastSendHash = keccak256(abi.encode(destinationChainSelector, message));
        IERC20 token = IERC20(message.tokenAmounts[0].token);
        require(
            token.transferFrom(
                msg.sender,
                address(this),
                message.tokenAmounts[0].amount
            ),
            "pull failed"
        );
        if (rejectAfterPull) revert RouterRejectedAfterPull();
        return MESSAGE_ID;
    }

    function _fee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory message
    ) private view returns (uint256) {
        if (!useMessageHashFee) return fee;
        return
            (uint256(keccak256(abi.encode(destinationChainSelector, message))) %
                1 ether) + 1;
    }
}
