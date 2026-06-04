// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/MidasTimelockManager.sol";

contract MidasTimelockManagerTest is MidasTimelockManager {
    uint256 private _defaultDelay;

    function _disableInitializers() internal override {}

    function setDefaultDelay(uint256 delay) external override {
        _defaultDelay = delay;
    }

    function defaultDelay() public view override returns (uint256) {
        return _defaultDelay;
    }
}
