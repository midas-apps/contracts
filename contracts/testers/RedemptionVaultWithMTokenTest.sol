// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithMToken.sol";

contract RedemptionVaultWithMTokenTest is RedemptionVaultWithMToken {
    function _disableInitializers() internal override {}

    function checkAndRedeemMToken(
        address token,
        uint256 amount,
        uint256 rate
    ) external {
        _postRedeemInstant(
            token,
            CalcAndValidateRedeemResult({
                feeAmount: 0,
                amountTokenOutWithoutFee: amount,
                amountTokenOut: 0,
                tokenOutRate: rate,
                mTokenRate: 0,
                tokenOutDecimals: 0
            })
        );
    }
}
