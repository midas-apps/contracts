// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    function _disableInitializers() internal override {}

    function initialize(CommonVaultInitParams calldata _commonVaultInitParams)
        external
        initializer
    {
        __ManageableVault_init(_commonVaultInitParams);
    }

    function initializeWithoutInitializer(
        CommonVaultInitParams calldata _commonVaultInitParams
    ) external {
        __ManageableVault_init(_commonVaultInitParams);
    }

    function vaultRole() public view virtual override returns (bytes32) {}
}
