// solhint-disable
// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MorphoVaultMock is ERC20 {
    using SafeERC20 for IERC20;

    address public immutable underlyingAsset;

    uint256 public exchangeRateNumerator;
    uint256 public constant RATE_PRECISION = 1e18;

    constructor(address _underlyingAsset) ERC20("MorphoVaultMock", "mvMOCK") {
        underlyingAsset = _underlyingAsset;
        exchangeRateNumerator = RATE_PRECISION;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setExchangeRate(uint256 _numerator) external {
        exchangeRateNumerator = _numerator;
    }

    function withdrawAdmin(
        address token,
        address to,
        uint256 amount
    ) external {
        IERC20(token).safeTransfer(to, amount);
    }

    function asset() external view returns (address) {
        return underlyingAsset;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares) {
        shares = previewWithdraw(assets);

        require(
            balanceOf(owner) >= shares,
            "MorphoVaultMock: InsufficientShares"
        );

        uint256 vaultBalance = IERC20(underlyingAsset).balanceOf(address(this));
        require(
            vaultBalance >= assets,
            "MorphoVaultMock: InsufficientLiquidity"
        );

        _burn(owner, shares);
        IERC20(underlyingAsset).safeTransfer(receiver, assets);

        return shares;
    }

    function previewWithdraw(uint256 assets)
        public
        view
        returns (uint256 shares)
    {
        // round up
        shares =
            (assets * RATE_PRECISION + exchangeRateNumerator - 1) /
            exchangeRateNumerator;
    }

    function convertToAssets(uint256 shares)
        external
        view
        returns (uint256 assets)
    {
        assets = (shares * exchangeRateNumerator) / RATE_PRECISION;
    }
}
