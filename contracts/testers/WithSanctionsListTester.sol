// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../abstract/WithSanctionsList.sol";

// TODO: add natspec
contract WithSanctionsListTester is WithSanctionsList {
    function initialize(address _accessControl, address _sanctionsList)
        external
        initializer
    {
        __WithSanctionsList_init(_accessControl, _sanctionsList);
    }

    function initializeWithoutInitializer(
        address _accessControl,
        address _sanctionsList
    ) external {
        __WithSanctionsList_init(_accessControl, _sanctionsList);
    }

    function initializeUnchainedWithoutInitializer(address _sanctionsList)
        external
    {
        __WithSanctionsList_init_unchained(_sanctionsList);
    }

    function onlyNotSanctionedTester(address user)
        public
        onlyNotSanctioned(user)
    {}

    function sanctionsListAdminRole() public pure returns (bytes32) {
        return keccak256("TESTER_SANCTIONS_LIST_ADMIN_ROLE");
    }

    function _validateSanctionListAdminAccess(address account)
        internal
        view
        override
    {
        if (accessControl.hasRole(sanctionsListAdminRole(), account)) return;
        _hasFunctionPermission(sanctionsListAdminRole(), msg.sig, account);
    }

    function _disableInitializers() internal override {}
}
