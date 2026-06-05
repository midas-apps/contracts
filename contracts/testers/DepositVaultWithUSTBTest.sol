// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVaultWithUSTB.sol";
import "./DepositVaultTest.sol";

contract DepositVaultWithUSTBTest is
    DepositVaultTestBase,
    DepositVaultWithUSTB
{
    constructor()
        DepositVaultWithUSTB(
            keccak256("DEPOSIT_VAULT_ADMIN_ROLE"),
            GREENLISTED_ROLE
        )
    {}

    function _disableInitializers()
        internal
        override(Initializable, DepositVaultTestBase)
    {
        DepositVaultTestBase._disableInitializers();
    }

    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal virtual override(DepositVaultWithUSTB, DepositVault) {
        DepositVaultWithUSTB._instantTransferTokensToTokensReceiver(
            tokenIn,
            amountToken,
            tokensDecimals
        );
    }

    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        override(DepositVaultTestBase, ManageableVault)
        returns (uint256)
    {
        return DepositVaultTestBase._getTokenRate(dataFeed, stable);
    }

    function contractAdminRole()
        public
        view
        override(DepositVaultTestBase, ManageableVault)
        returns (bytes32)
    {
        return DepositVaultTestBase.contractAdminRole();
    }
}
