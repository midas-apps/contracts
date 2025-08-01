// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../access/Greenlistable.sol";

contract GreenlistableTester is Greenlistable {
    function initialize(address _accessControl) external initializer {
        __Greenlistable_init(_accessControl);
    }

    function initializeWithoutInitializer(address _accessControl) external {
        __Greenlistable_init(_accessControl);
    }

    function initializeUnchainedWithoutInitializer() external {
        __Greenlistable_init_unchained();
    }

    function onlyGreenlistedTester(address account)
        external
        onlyGreenlisted(account)
    {}

    function onlyGreenlistTogglerTester(address account) external view {
        _onlyGreenlistToggler(account);
    }

    function _disableInitializers() internal override {}

    function greenlistTogglerRole()
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return keccak256("GREENLIST_TOGGLER_ROLE");
    }
}
