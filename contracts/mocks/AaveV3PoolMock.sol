// solhint-disable
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/aave/IAaveV3Pool.sol";
import "./ERC20Mock.sol";

/**
 * @title AaveV3PoolMock
 * @notice Mock contract simulating Aave V3 Pool behavior for testing
 * @dev Implements withdraw() and getReserveData() from IAaveV3Pool.
 * The mock burns aTokens from the caller (vault) and transfers underlying to `to`.
 */
contract AaveV3PoolMock {
    using SafeERC20 for IERC20;

    /// @notice Mapping from underlying asset to its aToken address
    mapping(address => address) public reserveATokens;

    // ──────────────────────────── Admin helpers ────────────────────────────

    /**
     * @notice Register an aToken for an underlying asset
     * @param asset The underlying asset address (e.g. USDC)
     * @param aToken The aToken address (e.g. aUSDC)
     */
    function setReserveAToken(address asset, address aToken) external {
        reserveATokens[asset] = aToken;
    }

    // ──────────────────────────── IAaveV3Pool ──────────────────────────────

    /**
     * @notice Simulates Aave V3 Pool withdraw: burns aTokens from caller, transfers underlying to `to`
     * @param asset The underlying asset to withdraw
     * @param amount The amount to withdraw (in asset decimals)
     * @param to The recipient of the underlying tokens
     * @return The actual amount withdrawn
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        address aToken = reserveATokens[asset];
        require(aToken != address(0), "AaveV3PoolMock: NoReserve");

        // Check pool has enough underlying liquidity
        uint256 poolBalance = IERC20(asset).balanceOf(address(this));
        require(poolBalance >= amount, "AaveV3PoolMock: InsufficientLiquidity");

        // Burn aTokens from the caller (simulates Aave burning aTokens from the vault)
        ERC20Mock(aToken).burn(msg.sender, amount);

        // Transfer underlying to recipient
        IERC20(asset).safeTransfer(to, amount);

        return amount;
    }

    /**
     * @notice Returns reserve data for an asset (only aTokenAddress is populated)
     * @param asset The underlying asset address
     * @return data The ReserveData struct
     */
    function getReserveData(address asset)
        external
        view
        returns (IAaveV3Pool.ReserveData memory data)
    {
        data.aTokenAddress = reserveATokens[asset];
        // All other fields default to zero
        return data;
    }

    /**
     * @notice Withdraw any token from the mock (admin utility for tests)
     * @param token The token to withdraw
     * @param to The recipient
     * @param amount The amount to withdraw
     */
    function withdrawAdmin(
        address token,
        address to,
        uint256 amount
    ) external {
        IERC20(token).safeTransfer(to, amount);
    }
}
