// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {BaseGuard} from "@gnosis-guild/zodiac-core/contracts/guard/BaseGuard.sol";
import {Operation} from "@gnosis-guild/zodiac-core/contracts/core/Operation.sol";
import {Delay} from "@gnosis-guild/zodiac-modules/contracts/delay/Delay.sol";

/**
 * @title EnforceDelayModifierGuard
 * @notice Guard that enforces all Safe transactions
 * initiated trough `execTransaction` to go through the delay modifier
 * @author RedDuck Software
 */
contract EnforceDelayModifierGuard is BaseGuard {
    address public immutable delayModifier;

    /**
     * @notice error thrown when a target is not the delay modifier
     * @param target target address
     */
    error TargetNotDelayModifier(address target);

    /**
     * @notice error thrown when a function selector is not allowed
     * @param target target address
     * @param functionSelector function selector
     */
    error TargetFunctionNotAllowed(address target, bytes4 functionSelector);

    /**
     * @notice constructor
     * @param _delayModifier address of the delay modifier
     */
    constructor(address _delayModifier) {
        delayModifier = _delayModifier;
    }

    /**
     * @inheritdoc BaseGuard
     */
    function checkTransaction(
        address to,
        uint256, /* value */
        bytes memory data,
        Operation, /* operation */
        uint256, /* safeTxGas */
        uint256, /* baseGas */
        uint256, /* gasPrice */
        address, /* gasToken */
        // solhint-disable-next-line no-unused-vars
        address payable, /* refundReceiver */
        bytes memory, /* signatures */
        address /* msgSender */
    ) external override {
        if (to != delayModifier) {
            revert TargetNotDelayModifier(to);
        }

        // wont revert even if data is empty
        bytes4 selector = bytes4(data);
        if (
            selector != Delay.execTransactionFromModule.selector &&
            selector != Delay.execTransactionFromModuleReturnData.selector &&
            selector != Delay.setTxNonce.selector
        ) {
            revert TargetFunctionNotAllowed(to, selector);
        }
    }

    /**
     * @inheritdoc BaseGuard
     */
    function checkAfterExecution(bytes32 txHash, bool success)
        external
        override
    {}
}
