// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "./RedemptionVault.sol";

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
     * @dev added second gap here to match the storage layout
     * from the previous contracts inheritance tree
     */
    uint256[50] private ___gap;

    /**
     * @dev legacy storage slot kept for layout compatibility
     * @custom:oz-renamed-from mTbillRedemptionVault
     * @custom:oz-retyped-from IRedemptionVault
     */
    // solhint-disable-next-line var-name-mixedcase
    address private _mTbillRedemptionVault_deprecated;

    /**
     * @dev legacy storage slot kept for layout compatibility
     * @custom:oz-renamed-from liquidityProvider
     */
    // solhint-disable-next-line var-name-mixedcase
    address private _liquidityProvider_deprecated;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;
}
