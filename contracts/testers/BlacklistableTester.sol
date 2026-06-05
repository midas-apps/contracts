// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../access/Blacklistable.sol";

contract BlacklistableTester is Blacklistable {
    function initialize(address _accessControl) external initializer {
        __WithMidasAccessControl_init(_accessControl);
    }

    function onlyNotBlacklistedTester(address account)
        external
        onlyNotBlacklisted(account)
    {}

    function contractAdminRole() public pure override returns (bytes32) {
        return _DEFAULT_ADMIN_ROLE;
    }

    function _disableInitializers() internal override {}
}
