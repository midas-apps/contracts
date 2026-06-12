// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../DepositVault.sol";
import {ManageableVaultTesterBase} from "./ManageableVaultTester.sol";

abstract contract DepositVaultTestBase is
    DepositVault,
    ManageableVaultTesterBase
{
    function _disableInitializers()
        internal
        virtual
        override(Initializable, ManageableVaultTesterBase)
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
        override(ManageableVaultTesterBase, ManageableVault)
        returns (uint256)
    {
        return ManageableVaultTesterBase._getTokenRate(dataFeed, stable);
    }

    function contractAdminRole()
        public
        view
        virtual
        override(ManageableVaultTesterBase, ManageableVault)
        returns (bytes32)
    {
        return ManageableVault.contractAdminRole();
    }
}

contract DepositVaultTest is DepositVaultTestBase {
    constructor()
        DepositVault(keccak256("DEPOSIT_VAULT_ADMIN_ROLE"), GREENLISTED_ROLE)
    {}
}
