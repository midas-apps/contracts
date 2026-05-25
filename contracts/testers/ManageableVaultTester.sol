// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../abstract/ManageableVault.sol";

contract ManageableVaultTester is ManageableVault {
    bytes32 private _vaultRoleOverride;
    bool private _overrideGetTokenRate;
    uint256 private _getTokenRateValue;

    function _disableInitializers() internal virtual override {}

    function setVaultRole(bytes32 role) external {
        _vaultRoleOverride = role;
    }

    function setOverrideGetTokenRate(bool _override) external {
        _overrideGetTokenRate = _override;
    }

    function tokenTransferFromToTester(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) external {
        _tokenTransferFromTo(token, from, to, amount, tokenDecimals);
    }

    function tokenTransferToUserTester(
        address token,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) external {
        _tokenTransferToUser(token, to, amount, tokenDecimals);
    }

    function setGetTokenRateValue(uint256 val) external {
        _getTokenRateValue = val;
    }

    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        virtual
        override
        returns (uint256)
    {
        if (_overrideGetTokenRate) {
            return _getTokenRateValue;
        }

        return super._getTokenRate(dataFeed, stable);
    }

    function initializeExternal(
        CommonVaultInitParams calldata _commonVaultInitParams
    ) external initializer {
        __ManageableVault_init(_commonVaultInitParams);
    }

    function initializeWithoutInitializer(
        CommonVaultInitParams calldata _commonVaultInitParams
    ) external {
        __ManageableVault_init(_commonVaultInitParams);
    }

    function vaultRole() public pure virtual override returns (bytes32) {
        return keccak256("VAULT_ADMIN_ROLE");
    }
}
