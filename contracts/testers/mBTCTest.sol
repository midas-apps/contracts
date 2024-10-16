// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../mBTC/mBTC.sol";

//solhint-disable contract-name-camelcase
contract mBTCTest is mBTC {
    function _disableInitializers() internal override {}
}
