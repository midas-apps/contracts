// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {MidasInitializable} from "../abstract/MidasInitializable.sol";

contract MidasInitializableTester is MidasInitializable {
    uint256 public initializeCallsCount;

    uint256 public reinitCallsCount;

    function initialize() external {
        _initializeV1();
        initializeV2();
    }

    function initializeV2() public reinitializer(2) onlyProxyAdmin {
        reinitCallsCount++;
    }

    function _initializeV1() private initializer {
        initializeCallsCount++;
    }
}
