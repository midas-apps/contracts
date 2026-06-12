// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../access/MidasAccessControl.sol";

contract MidasAccessControlTest is MidasAccessControl {
    function _disableInitializers() internal override {}

    function setDefaultDelayTest(uint32 delay) external {
        defaultDelay = delay;
    }
}
