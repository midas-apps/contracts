// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../access/MidasAccessControlTimelockController.sol";

contract MidasAccessControlTimelockControllerTest is
    MidasAccessControlTimelockController
{
    function _disableInitializers() internal override {}
}
