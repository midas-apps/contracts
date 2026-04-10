// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/Blacklistable.sol";

contract BlacklistableTester is Blacklistable {
    function initialize(address _accessControl) external initializer {
        __Blacklistable_init(_accessControl);
    }

    function initializeWithoutInitializer(address _accessControl) external {
        __Blacklistable_init(_accessControl);
    }

    function initializeUnchainedWithoutInitializer() external {
        __Blacklistable_init_unchained();
    }

    function onlyNotBlacklistedTester(address account)
        external
        onlyNotBlacklisted(account)
    {}

    function _disableInitializers() internal override {}
}
