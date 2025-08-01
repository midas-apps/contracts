// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../DepositVault.sol";

contract DepositVaultTest is DepositVault {
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
        uint256 _minMTokenAmountForFirstDeposit
    ) external {
        __DepositVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _minMTokenAmountForFirstDeposit
        );
    }

    function tokenTransferFromToTester(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) external {
        _tokenTransferFromTo(token, from, to, amount, tokenDecimals);
    }

    function tokenTransferToUserTester(
        address token,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) external {
        _tokenTransferToUser(token, to, amount, tokenDecimals);
    }

    function setOverrideGetTokenRate(bool val) external {
        _overrideGetTokenRate = val;
    }

    function setGetTokenRateValue(uint256 val) external {
        _getTokenRateValue = val;
    }

    function calcAndValidateDeposit(
        address user,
        address tokenIn,
        uint256 amountToken,
        bool isInstant
    ) external returns (CalcAndValidateDepositResult memory) {
        return _calcAndValidateDeposit(user, tokenIn, amountToken, isInstant);
    }

    function convertTokenToUsdTest(address tokenIn, uint256 amount)
        external
        returns (uint256 amountInUsd, uint256 rate)
    {
        return _convertTokenToUsd(tokenIn, amount);
    }

    function convertUsdToMTokenTest(uint256 amountUsd)
        external
        returns (uint256 amountMToken, uint256 mTokenRate)
    {
        return _convertUsdToMToken(amountUsd);
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
