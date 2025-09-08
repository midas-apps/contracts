// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../feeds/CompositeDataFeed.sol";

contract CompositeDataFeedTest is CompositeDataFeed {
    function _disableInitializers() internal override {}
}
