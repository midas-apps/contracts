// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

/**
 * @title IVaultWithUSYC
 * @notice Common interface of DepositVaultWithUSYC and RedemptionVaultWithUSYC,
 * used by the vaults to validate the Teller fee rate of their paired vault
 * @author RedDuck Software
 */
interface IVaultWithUSYC {
    /**
     * @notice Fee rate the USYC Teller is expected to charge the vault:
     * subscription fee rate for a deposit vault, redemption fee rate
     * for a redemption vault
     * @return fee rate in Teller units, 1e18 = 1%
     */
    function anticipatedFeeRate() external view returns (uint256);
}
