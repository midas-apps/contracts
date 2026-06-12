// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../access/MidasTimelockManager.sol";

contract MidasTimelockManagerTest is MidasTimelockManager {
    function _disableInitializers() internal override {}
}
