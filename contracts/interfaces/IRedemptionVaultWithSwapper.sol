// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "./IRedemptionVault.sol";

/**
 * @title IRedemptionVaultWithSwapper
 * @author RedDuck Software
 */
interface IRedemptionVaultWithSwapper is IRedemptionVault {
    /**
     * @param caller caller address (msg.sender)
     * @param provider new LP address
     */
    event SetLiquidityProvider(
        address indexed caller,
        address indexed provider
    );

    /**
     * @notice set new liquidity provider address
     * @param provider new liquidity provider address
     */
    function setLiquidityProvider(address provider) external;
}
