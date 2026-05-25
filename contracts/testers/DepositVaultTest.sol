// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVault.sol";
import {ManageableVaultTester} from "./ManageableVaultTester.sol";

contract DepositVaultTest is DepositVault, ManageableVaultTester {
    function _disableInitializers()
        internal
        virtual
        override(Initializable, ManageableVaultTester)
    {}

    function convertTokenToUsdTest(address tokenIn, uint256 amount)
        external
        view
        returns (uint256 amountInUsd, uint256 rate)
    {
        return _convertTokenToUsd(tokenIn, amount);
    }

    function convertUsdToMTokenTest(uint256 amountUsd)
        external
        view
        returns (uint256 amountMToken, uint256 mTokenRate)
    {
        return _convertUsdToMToken(amountUsd);
    }

    function calcAndValidateDeposit(
        address user,
        address tokenIn,
        uint256 amountToken,
        bool isInstant
    ) external returns (CalcAndValidateDepositResult memory) {
        return _calcAndValidateDeposit(user, tokenIn, amountToken, isInstant);
    }

    function calculateHoldbackPartRateFromAvgTest(
        uint256 depositedUsdAmount,
        uint256 depositedInstantUsdAmount,
        uint256 mTokenRate,
        uint256 avgMTokenRate
    ) external pure returns (uint256) {
        return
            _calculateHoldbackPartRateFromAvg(
                Request({
                    depositedInstantUsdAmount: depositedInstantUsdAmount,
                    tokenOutRate: mTokenRate,
                    approvedTokenOutRate: 0,
                    depositedUsdAmount: depositedUsdAmount,
                    usdAmountWithoutFees: 0,
                    recipient: address(0),
                    claimer: address(0),
                    tokenIn: address(0),
                    status: RequestStatus.Pending,
                    amountMToken: 0
                }),
                avgMTokenRate
            );
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
        override(ManageableVaultTester, DepositVault)
        returns (bytes32)
    {
        return DepositVault.vaultRole();
    }
}
