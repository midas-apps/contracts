// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mMEV/mMEV.sol";

//solhint-disable contract-name-camelcase
contract mMEVTest is mMEV {
    function _disableInitializers() internal override {}
}
