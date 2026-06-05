// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../feeds/DataFeed.sol";

contract DataFeedTest is DataFeed {
    constructor() DataFeed(_DEFAULT_ADMIN_ROLE) {}

    function _disableInitializers() internal override {}
}
