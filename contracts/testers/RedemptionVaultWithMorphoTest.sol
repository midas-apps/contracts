// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVaultWithMorpho.sol";

contract RedemptionVaultWithMorphoTest is RedemptionVaultWithMorpho {
    function _disableInitializers() internal override {}

    function checkAndRedeemMorpho(address token, uint256 amount) external {
        _postRedeemInstant(
            token,
            CalcAndValidateRedeemResult({
                feeAmount: 0,
                amountTokenOutWithoutFee: amount,
                amountTokenOut: 0,
                tokenOutRate: 0,
                mTokenRate: 0,
                tokenOutDecimals: 0
            })
        );
    }
}
