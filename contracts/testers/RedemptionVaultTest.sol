// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../RedemptionVault.sol";

contract RedemptionVaultTest is RedemptionVault {
    bool private _overrideGetTokenRate;
    uint256 private _getTokenRateValue;

    function _disableInitializers() internal override {}

    function initializeWithoutInitializer(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        FiatRedeptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer
    ) external {
        __RedemptionVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _fiatRedemptionInitParams,
            _requestRedeemer
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
        bool isInstant,
        bool isFiat
    ) external returns (CalcAndValidateRedeemResult memory calcResult) {
        return
            _calcAndValidateRedeem(
                user,
                tokenOut,
                amountMTokenIn,
                isInstant,
                isFiat
            );
    }

    function convertUsdToTokenTest(uint256 amountUsd, address tokenOut)
        external
        returns (uint256 amountToken, uint256 tokenRate)
    {
        return _convertUsdToToken(amountUsd, tokenOut);
    }

    function convertMTokenToUsdTest(uint256 amountMToken)
        external
        returns (uint256 amountUsd, uint256 mTokenRate)
    {
        return _convertMTokenToUsd(amountMToken);
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
