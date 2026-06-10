// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/MidasAccessControl.sol";

contract MidasAccessControlTest is MidasAccessControl {
    function _disableInitializers() internal override {}

    function setDefaultDelayTest(uint256 delay) external {
        defaultDelay = delay;
    }
}
