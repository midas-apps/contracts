// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../RedemptionVaultWithUSTB.sol";
import "./RedemptionVaultTest.sol";

contract RedemptionVaultWithUSTBTest is
    RedemptionVaultWithUSTB,
    RedemptionVaultTest
{
    function _disableInitializers()
        internal
        virtual
        override(Initializable, RedemptionVaultTest)
    {
        RedemptionVaultTest._disableInitializers();
    }

    function checkAndRedeemUSTB(address token, uint256 amount)
        external
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        uint256 tokenDecimals = _tokenDecimals(token);
        uint256 balance = DecimalsCorrectionLibrary.convertToBase18(
            IERC20(token).balanceOf(address(this)),
            tokenDecimals
        );
        uint256 amountBase18 = DecimalsCorrectionLibrary.convertToBase18(
            amount,
            tokenDecimals
        );
        uint256 missingAmount = amountBase18 > balance
            ? amountBase18 - balance
            : 0;

        return
            _useVaultLiquidity(token, missingAmount, 0, balance, tokenDecimals);
    }

    function _useVaultLiquidity(
        address tokenOut,
        uint256 amountTokenOutBase18,
        uint256 tokenOutRate,
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    )
        internal
        override(RedemptionVaultWithUSTB, RedemptionVault)
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        return
            RedemptionVaultWithUSTB._useVaultLiquidity(
                tokenOut,
                amountTokenOutBase18,
                tokenOutRate,
                currentTokenOutBalanceBase18,
                tokenOutDecimals
            );
    }

    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        override(ManageableVault, RedemptionVaultTest)
        returns (uint256)
    {
        return RedemptionVaultTest._getTokenRate(dataFeed, stable);
    }
}
