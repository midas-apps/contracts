// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Router} from "@chainlink/contracts-ccip/contracts/Router.sol";
import {TokenAdminRegistry} from "@chainlink/contracts-ccip/contracts/tokenAdminRegistry/TokenAdminRegistry.sol";
import {OnRampHelper} from "@chainlink/contracts-ccip/contracts/test/helpers/OnRampHelper.sol";
import {OffRampHelper} from "@chainlink/contracts-ccip/contracts/test/helpers/OffRampHelper.sol";
import {FeeQuoterHelper} from "@chainlink/contracts-ccip/contracts/test/helpers/FeeQuoterHelper.sol";
import {LogMessageDataReceiver} from "@chainlink/contracts-ccip/contracts/test/helpers/receivers/LogMessageDataReceiver.sol";
import {MockVerifier} from "@chainlink/contracts-ccip/contracts/test/mocks/MockVerifier.sol";
import {MockExecutor} from "@chainlink/contracts-ccip/contracts/test/mocks/MockExecutor.sol";
import {IPoolV1} from "@chainlink/contracts-ccip/contracts/interfaces/IPool.sol";
import {IPoolV2} from "@chainlink/contracts-ccip/contracts/interfaces/IPoolV2.sol";
import {Pool} from "@chainlink/contracts-ccip/contracts/libraries/Pool.sol";
import {MessageV1Codec} from "@chainlink/contracts-ccip/contracts/libraries/MessageV1Codec.sol";
import {WETH9} from "@chainlink/contracts/src/v0.8/vendor/canonical-weth/WETH9.sol";

/**
 * @dev Compile-only import anchor for the exact CCIP package contracts used by
 * the in-process V2 lane tests.
 */
contract CCIPV2TestImports {
    function poolV2InterfaceId() external pure returns (bytes4) {
        return type(IPoolV2).interfaceId;
    }

    function poolV1InterfaceId() external pure returns (bytes4) {
        return type(IPoolV1).interfaceId;
    }

    function ccipPoolV1InterfaceId() external pure returns (bytes4) {
        return Pool.CCIP_POOL_V1;
    }

    function decodeMessageV1(bytes calldata encodedMessage)
        external
        pure
        returns (MessageV1Codec.MessageV1 memory)
    {
        return MessageV1Codec._decodeMessageV1(encodedMessage);
    }
}
