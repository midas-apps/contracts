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
    bool public shouldRevertDeposit;

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

    function setShouldRevertDeposit(bool _shouldRevert) external {
        shouldRevertDeposit = _shouldRevert;
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

    function deposit(uint256 assets, address receiver)
        external
        returns (uint256 shares)
    {
        require(!shouldRevertDeposit, "MorphoVaultMock: DepositReverted");
        shares = previewDeposit(assets);

        IERC20(underlyingAsset).safeTransferFrom(
            msg.sender,
            address(this),
            assets
        );
        _mint(receiver, shares);

        return shares;
    }

    function previewDeposit(uint256 assets)
        public
        view
        returns (uint256 shares)
    {
        shares = (assets * RATE_PRECISION) / exchangeRateNumerator;
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256 assets) {
        assets = convertToAssets(shares);
        withdraw(assets, receiver, owner);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public returns (uint256 shares) {
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
        public
        view
        returns (uint256 assets)
    {
        assets = (shares * exchangeRateNumerator) / RATE_PRECISION;
    }
}
