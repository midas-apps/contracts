// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithAave.sol";

contract RedemptionVaultWithAaveTest is RedemptionVaultWithAave {
    function _disableInitializers() internal override {}

    function checkAndRedeemAave(address token, uint256 amount) external {
        uint256 tokenDecimals = _tokenDecimals(token);
        _postRedeemInstant(
            token,
            CalcAndValidateRedeemResult({
                feeAmount: 0,
                amountTokenOutWithoutFee: DecimalsCorrectionLibrary
                    .convertToBase18(amount, tokenDecimals),
                amountTokenOut: 0,
                tokenOutRate: 0,
                mTokenRate: 0,
                tokenOutDecimals: tokenDecimals
            })
        );
    }
}
