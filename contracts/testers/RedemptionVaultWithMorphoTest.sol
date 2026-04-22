// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../RedemptionVaultWithMorpho.sol";
import "./RedemptionVaultTest.sol";

contract RedemptionVaultWithMorphoTest is
    RedemptionVaultWithMorpho,
    RedemptionVaultTest
{
    function _disableInitializers()
        internal
        virtual
        override(Initializable, RedemptionVaultTest)
    {
        RedemptionVaultTest._disableInitializers();
    }

    function checkAndRedeemMorpho(address token, uint256 amount)
        external
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        uint256 tokenDecimals = _tokenDecimals(token);
        return
            _useVaultLiquidity(
                token,
                DecimalsCorrectionLibrary.convertToBase18(
                    amount,
                    tokenDecimals
                ),
                0,
                DecimalsCorrectionLibrary.convertToBase18(
                    IERC20(token).balanceOf(address(this)),
                    tokenDecimals
                ),
                tokenDecimals
            );
    }

    function _useVaultLiquidity(
        address token,
        uint256 amountTokenOutBase18,
        uint256 tokenOutRate,
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    )
        internal
        override(RedemptionVaultWithMorpho, RedemptionVault)
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        return
            RedemptionVaultWithMorpho._useVaultLiquidity(
                token,
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
