// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVaultWithMToken.sol";
import "./DepositVaultTest.sol";

contract DepositVaultWithMTokenTest is
    DepositVaultTest,
    DepositVaultWithMToken
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
        override(DepositVaultTest, ManageableVault)
        returns (uint256)
    {
        return DepositVaultTest._getTokenRate(dataFeed, stable);
    }
}
