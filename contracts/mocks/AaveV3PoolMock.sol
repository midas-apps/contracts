// solhint-disable
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20Mock.sol";

contract AaveV3PoolMock {
    using SafeERC20 for IERC20;

    mapping(address => address) public reserveATokens;

    function setReserveAToken(address asset, address aToken) external {
        reserveATokens[asset] = aToken;
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        address aToken = reserveATokens[asset];
        require(aToken != address(0), "AaveV3PoolMock: NoReserve");

        uint256 poolBalance = IERC20(asset).balanceOf(address(this));
        require(poolBalance >= amount, "AaveV3PoolMock: InsufficientLiquidity");

        ERC20Mock(aToken).burn(msg.sender, amount);
        IERC20(asset).safeTransfer(to, amount);

        return amount;
    }

    function getReserveAToken(address asset) external view returns (address) {
        return reserveATokens[asset];
    }

    function withdrawAdmin(
        address token,
        address to,
        uint256 amount
    ) external {
        IERC20(token).safeTransfer(to, amount);
    }
}
