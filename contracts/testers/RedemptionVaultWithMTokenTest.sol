// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../RedemptionVaultWithMToken.sol";
import "./RedemptionVaultTest.sol";

contract RedemptionVaultWithMTokenTest is
    RedemptionVaultTestBase,
    RedemptionVaultWithMToken
{
    constructor()
        RedemptionVaultWithMToken(
            keccak256("REDEMPTION_VAULT_ADMIN_ROLE"),
            GREENLISTED_ROLE
        )
    {}

    function _disableInitializers()
        internal
        virtual
        override(Initializable, RedemptionVaultTestBase)
    {
        RedemptionVaultTestBase._disableInitializers();
    }

    function checkAndRedeemMToken(
        address token,
        uint256 amount,
        uint256 rate
    )
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
            _obtainVaultLiquidity(
                token,
                missingAmount,
                rate,
                balance,
                tokenDecimals
            );
    }

    function _obtainVaultLiquidity(
        address token,
        uint256 amountTokenOutBase18,
        uint256 tokenOutRate,
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    )
        internal
        override(RedemptionVaultWithMToken, RedemptionVault)
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        return
            RedemptionVaultWithMToken._obtainVaultLiquidity(
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
        override(RedemptionVaultTestBase, ManageableVault)
        returns (uint256)
    {
        return RedemptionVaultTestBase._getTokenRate(dataFeed, stable);
    }

    function contractAdminRole()
        public
        view
        override(RedemptionVaultTestBase, ManageableVault)
        returns (bytes32)
    {
        return RedemptionVaultTestBase.contractAdminRole();
    }
}
