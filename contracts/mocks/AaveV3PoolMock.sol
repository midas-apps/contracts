// solhint-disable
// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20Mock.sol";

contract AaveV3PoolMock {
    using SafeERC20 for IERC20;

    mapping(address => address) public reserveATokens;
    uint256 public withdrawReturnBps = 10_000;
    bool public shouldRevertSupply;

    function setReserveAToken(address asset, address aToken) external {
        reserveATokens[asset] = aToken;
    }

    function setWithdrawReturnBps(uint256 bps) external {
        require(bps <= 10_000, "AaveV3PoolMock: InvalidBps");
        withdrawReturnBps = bps;
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

        uint256 returnedAmount = (amount * withdrawReturnBps) / 10_000;
        ERC20Mock(aToken).burn(msg.sender, amount);
        IERC20(asset).safeTransfer(to, returnedAmount);

        return returnedAmount;
    }

    function setShouldRevertSupply(bool _shouldRevert) external {
        shouldRevertSupply = _shouldRevert;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        require(!shouldRevertSupply, "AaveV3PoolMock: SupplyReverted");
        address aToken = reserveATokens[asset];
        require(aToken != address(0), "AaveV3PoolMock: NoReserve");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        ERC20Mock(aToken).mint(onBehalfOf, amount);
    }

    function withdrawAdmin(
        address token,
        address to,
        uint256 amount
    ) external {
        IERC20(token).safeTransfer(to, amount);
    }

    function getReserveAToken(address asset) external view returns (address) {
        return reserveATokens[asset];
    }
}
