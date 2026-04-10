// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVaultWithUSTB.sol";
import "./DepositVaultTest.sol";

contract DepositVaultWithUSTBTest is DepositVaultTest, DepositVaultWithUSTB {
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
        override(DepositVaultTest, ManageableVault)
        returns (uint256)
    {
        return DepositVaultTest._getTokenRate(dataFeed, stable);
    }
}
