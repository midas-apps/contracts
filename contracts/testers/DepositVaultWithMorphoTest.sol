// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVaultWithMorpho.sol";
import "./DepositVaultTest.sol";

contract DepositVaultWithMorphoTest is
    DepositVaultTestBase,
    DepositVaultWithMorpho
{
    constructor()
        DepositVaultWithMorpho(
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
    ) internal virtual override(DepositVaultWithMorpho, DepositVault) {
        DepositVaultWithMorpho._instantTransferTokensToTokensReceiver(
            tokenIn,
            amountToken,
            tokensDecimals
        );
    }

    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override(DepositVaultWithMorpho, DepositVault) {
        DepositVaultWithMorpho._requestTransferTokensToTokensReceiver(
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
