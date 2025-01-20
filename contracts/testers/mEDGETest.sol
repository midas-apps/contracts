// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mEDGE/mEDGE.sol";

//solhint-disable contract-name-camelcase
contract mEDGETest is mEDGE {
    function _disableInitializers() internal override {}
}
