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

    function checkAndRedeemAave(address token, uint256 amount) external {
        uint256 tokenDecimals = _tokenDecimals(token);
        _postRedeemInstant(
            token,
            CalcAndValidateRedeemResult({
                feeAmount: 0,
                amountTokenOutWithoutFee: 0,
                amountTokenOut: DecimalsCorrectionLibrary.convertToBase18(
                    amount,
                    tokenDecimals
                ),
                tokenOutRate: 0,
                mTokenRate: 0,
                tokenOutDecimals: tokenDecimals
            })
        );
    }

    function _postRedeemInstant(
        address token,
        CalcAndValidateRedeemResult memory calcResult
    ) internal override(RedemptionVaultWithAave, RedemptionVault) {
        RedemptionVaultWithAave._postRedeemInstant(token, calcResult);
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
