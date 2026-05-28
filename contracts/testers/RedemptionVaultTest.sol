// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../RedemptionVault.sol";
import {ManageableVaultTester} from "./ManageableVaultTester.sol";

contract RedemptionVaultTest is RedemptionVault, ManageableVaultTester {
    function _disableInitializers()
        internal
        virtual
        override(Initializable, ManageableVaultTester)
    {}

    function calcAndValidateRedeemTest(
        address user,
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 overrideMTokenRate,
        uint256 overrideTokenOutRate,
        bool shouldOverrideFeePercent,
        uint256 overrideFeePercent,
        bool isInstant
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
                isInstant
            );
    }

    function calculateHoldbackPartRateFromAvgTest(
        uint256 amountMToken,
        uint256 amountMTokenInstant,
        uint256 mTokenRate,
        uint256 avgMTokenRate
    ) external pure returns (uint256) {
        return
            _calculateHoldbackPartRateFromAvg(
                Request({
                    amountMToken: amountMToken,
                    amountMTokenInstant: amountMTokenInstant,
                    mTokenRate: mTokenRate,
                    tokenOut: address(0),
                    tokenOutRate: 0,
                    feePercent: 0,
                    recipient: address(0),
                    status: RequestStatus.Pending,
                    approvedMTokenRate: 0,
                    amountTokenOut: 0
                }),
                avgMTokenRate
            );
    }

    function convertUsdToTokenTest(
        uint256 amountUsd,
        address tokenOut,
        uint256 overrideTokenOutRate
    ) external view returns (uint256 amountToken, uint256 tokenRate) {
        return _convertUsdToToken(amountUsd, tokenOut, overrideTokenOutRate);
    }

    function convertMTokenToUsdTest(
        uint256 amountMToken,
        uint256 overrideMTokenRate
    ) external view returns (uint256 amountUsd, uint256 mTokenRate) {
        return _convertMTokenToUsd(amountMToken, overrideMTokenRate);
    }

    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        virtual
        override(ManageableVaultTester, ManageableVault)
        returns (uint256)
    {
        return ManageableVaultTester._getTokenRate(dataFeed, stable);
    }

    function vaultRole()
        public
        pure
        virtual
        override(ManageableVaultTester, RedemptionVault)
        returns (bytes32)
    {
        return RedemptionVault.vaultRole();
    }
}
