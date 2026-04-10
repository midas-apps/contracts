// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../feeds/DataFeed.sol";

contract DataFeedTest is DataFeed {
    function _disableInitializers() internal override {}
}
