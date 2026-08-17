// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {mTokenPermissionedTest} from "./mTokenPermissionedTest.sol";

// solhint-disable-next-line contract-name-camelcase
contract mTokenPermissionedReentrantTest is mTokenPermissionedTest {
    address public hookTarget;
    bytes public hookData;
    bool public hookEnabled;
    bool public hookEntered;
    bool public hookSucceeded;
    uint256 public hookAttempts;

    function configureHook(
        address target,
        bytes calldata data,
        bool enabled
    ) external {
        hookTarget = target;
        hookData = data;
        hookEnabled = enabled;
        hookSucceeded = false;
        hookAttempts = 0;
    }

    function callTarget(address target, bytes calldata data)
        external
        returns (bytes memory result)
    {
        (bool success, bytes memory returnData) = target.call(data);
        require(success, "target call failed");
        return returnData;
    }

    function transfer(address recipient, uint256 amount)
        public
        override
        returns (bool)
    {
        if (hookEnabled && !hookEntered) {
            hookEntered = true;
            ++hookAttempts;
            (hookSucceeded, ) = hookTarget.call(hookData);
            hookEntered = false;
        }
        return super.transfer(recipient, amount);
    }
}
