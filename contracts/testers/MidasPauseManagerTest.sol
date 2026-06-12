// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../access/MidasPauseManager.sol";

contract MidasPauseManagerTest is MidasPauseManager {
    function _disableInitializers() internal override {}
}
