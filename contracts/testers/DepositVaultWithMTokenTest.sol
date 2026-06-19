// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVaultWithMToken.sol";
import "./DepositVaultTest.sol";

contract DepositVaultWithMTokenTest is
    DepositVaultTestBase,
    DepositVaultWithMToken
{
    constructor()
        DepositVaultWithMToken(
            keccak256("DEPOSIT_VAULT_ADMIN_ROLE"),
            AccessControlUtilsLibrary.DEFAULT_GREENLISTED_ROLE
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
    ) internal virtual override(DepositVaultWithMToken, DepositVault) {
        DepositVaultWithMToken._instantTransferTokensToTokensReceiver(
            tokenIn,
            amountToken,
            tokensDecimals
        );
    }

    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override(DepositVaultWithMToken, DepositVault) {
        DepositVaultWithMToken._requestTransferTokensToTokensReceiver(
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
