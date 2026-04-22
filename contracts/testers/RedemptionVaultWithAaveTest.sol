// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../RedemptionVaultWithAave.sol";
import "./RedemptionVaultTest.sol";

contract RedemptionVaultWithAaveTest is
    RedemptionVaultWithAave,
    RedemptionVaultTest
{
    function _disableInitializers()
        internal
        virtual
        override(Initializable, RedemptionVaultTest)
    {
        RedemptionVaultTest._disableInitializers();
    }

    function checkAndRedeemAave(address token, uint256 amount)
        external
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        uint256 tokenDecimals = _tokenDecimals(token);
        _useVaultLiquidity(
            token,
            DecimalsCorrectionLibrary.convertToBase18(amount, tokenDecimals),
            0,
            IERC20(token).balanceOf(address(this)),
            tokenDecimals
        );
    }

    function _useVaultLiquidity(
        address tokenOut,
        uint256 amountTokenOutBase18,
        uint256 tokenOutRate,
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    )
        internal
        override(RedemptionVaultWithAave, RedemptionVault)
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        return
            RedemptionVaultWithAave._useVaultLiquidity(
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
