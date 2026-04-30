// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "./RedemptionVault.sol";

// TODO: remove this contract
/**
 * @title RedemptionVaultWithSwapper
 * @notice Legacy swapper contract that is keeped for layout compatibility
 * with already deployed contracts.
 *
 * Legacy description:
 * Smart contract that handles mToken redemption.
 * In case of insufficient liquidity it uses a RV from a different
 * Midas product to fulfill instant redemption.
 * @author RedDuck Software
 */
contract RedemptionVaultWithSwapper is RedemptionVault {
    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;
}
