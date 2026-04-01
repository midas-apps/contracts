// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    function _disableInitializers() internal override {}

    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        CommonVaultV2InitParams calldata _commonVaultV2InitParams
    ) external initializer {
        __ManageableVault_init(_commonVaultInitParams);
        __ManageableVault_initV2(_commonVaultV2InitParams);
    }

    function initializeWithoutInitializer(
        CommonVaultInitParams calldata _commonVaultInitParams,
        CommonVaultV2InitParams calldata _commonVaultV2InitParams
    ) external {
        __ManageableVault_init(_commonVaultInitParams);
        __ManageableVault_initV2(_commonVaultV2InitParams);
    }

    function vaultRole() public view virtual override returns (bytes32) {}

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
