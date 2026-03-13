// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVault.sol";

contract RedemptionVaultTest is RedemptionVault {
    bool private _overrideGetTokenRate;
    uint256 private _getTokenRateValue;

    function _disableInitializers() internal override {}

    function initializeWithoutInitializer(
        CommonVaultInitParams calldata _commonVaultInitParams,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        FiatRedemptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer,
        address _loanLp,
        address _loanLpFeeReceiver
    ) external {
        __RedemptionVault_init(
            _commonVaultInitParams,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _fiatRedemptionInitParams,
            _requestRedeemer,
            _loanLp,
            _loanLpFeeReceiver
        );
    }

    function setOverrideGetTokenRate(bool val) external {
        _overrideGetTokenRate = val;
    }

    function setGetTokenRateValue(uint256 val) external {
        _getTokenRateValue = val;
    }

    function calcAndValidateRedeemTest(
        address user,
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 overrideMTokenRate,
        uint256 overrideTokenOutRate,
        bool shouldOverrideFeePercent,
        uint256 overrideFeePercent,
        bool isInstant,
        bool isFiat
    ) external returns (CalcAndValidateRedeemResult memory calcResult) {
        return
            _calcAndValidateRedeem(
                user,
                tokenOut,
                amountMTokenIn,
                overrideMTokenRate,
                overrideTokenOutRate,
                shouldOverrideFeePercent,
                overrideFeePercent,
                isInstant,
                isFiat
            );
    }

    function convertUsdToTokenTest(
        uint256 amountUsd,
        address tokenOut,
        uint256 overrideTokenOutRate
    ) external returns (uint256 amountToken, uint256 tokenRate) {
        return _convertUsdToToken(amountUsd, tokenOut, overrideTokenOutRate);
    }

    function convertMTokenToUsdTest(
        uint256 amountMToken,
        uint256 overrideMTokenRate
    ) external returns (uint256 amountUsd, uint256 mTokenRate) {
        return _convertMTokenToUsd(amountMToken, overrideMTokenRate);
    }

    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        override
        returns (uint256)
    {
        if (_overrideGetTokenRate) {
            return _getTokenRateValue;
        }

        return super._getTokenRate(dataFeed, stable);
    }
}
