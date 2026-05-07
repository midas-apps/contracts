// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/MidasPauseManager.sol";

contract MidasPauseManagerTest is MidasPauseManager {
    function _disableInitializers() internal override {}
}
