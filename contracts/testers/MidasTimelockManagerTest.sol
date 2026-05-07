// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/MidasTimelockManager.sol";

contract MidasTimelockManagerTest is MidasTimelockManager {
    function _disableInitializers() internal override {}
}
