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
     * @param caller caller address (msg.sender)
     * @param vault new underlying vault for swapper
     */
    event SetSwapperVault(address indexed caller, address indexed vault);

    /**
     * @notice sets new liquidity provider address
     * @param provider new liquidity provider address
     */
    function setLiquidityProvider(address provider) external;

    /**
     * @notice sets new underlying vault for swapper
     * @param vault new underlying vault for swapper
     */
    function setSwapperVault(address vault) external;
}
