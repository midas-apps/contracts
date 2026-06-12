// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "../feeds/CompositeDataFeed.sol";

contract CompositeDataFeedTest is CompositeDataFeed {
    constructor() CompositeDataFeed(_DEFAULT_ADMIN_ROLE) {}

    function _disableInitializers() internal override {}
}
