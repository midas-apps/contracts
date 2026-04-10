// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVaultWithMorpho.sol";
import "./DepositVaultTest.sol";

contract DepositVaultWithMorphoTest is
    DepositVaultTest,
    DepositVaultWithMorpho
{
    function _disableInitializers()
        internal
        override(Initializable, DepositVaultTest)
    {
        DepositVaultTest._disableInitializers();
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
        override(DepositVaultTest, ManageableVault)
        returns (uint256)
    {
        return DepositVaultTest._getTokenRate(dataFeed, stable);
    }
}
