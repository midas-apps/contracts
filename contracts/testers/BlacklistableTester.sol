// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../access/Blacklistable.sol";

contract BlacklistableTester is Blacklistable {
    function initialize(address _accessControl) external initializer {
        __Blacklistable_init(_accessControl);
    }

    function onlyNotBlacklistedTester(
        address account
    ) external onlyNotBlacklisted(account) {}
}
