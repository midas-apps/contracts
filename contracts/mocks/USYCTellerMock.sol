// solhint-disable
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./ERC20Mock.sol";

/**
 * @notice Mock of Circle's USYC Teller mirroring the behaviour verified on Arc:
 * - deposit pulls `asset` and mints shares at `mintPrice` rounding down
 * - redeem burns shares of `account == msg.sender` (no share approval needed)
 *   and pays `asset` at `redeemPrice` rounding down
 * - previewWithdrawData rounds shares up
 * - maxRedeem is capped by the asset liquidity held by the teller
 * - fee rates are reported but not charged (as on Arc), unless `chargeFees`
 *   is enabled to mimic a Teller that charges them (e.g. Ethereum)
 */
contract USYCTellerMock {
    using SafeERC20 for IERC20;

    error ZeroAssets();
    error ZeroShares();
    error NotPermissioned();
    error ExceedsMaxRedeem(uint256 shares, uint256 maxShares);

    address public immutable asset;
    address public immutable share;

    uint256 private immutable _assetUnit;
    uint256 private immutable _shareUnit;

    uint256 public mintPrice = 1e18;
    uint256 public redeemPrice = 1e18;

    uint256 private _subscriptionFeeRate;
    uint256 private _redemptionFeeRate;

    bool public depositReverts;
    bool public redeemReverts;
    bool public depositReturnsZero;
    bool public chargeFees;

    constructor(address _asset, address _share) {
        asset = _asset;
        share = _share;
        _assetUnit = 10**IERC20Metadata(_asset).decimals();
        _shareUnit = 10**IERC20Metadata(_share).decimals();
    }

    /// @dev `price` is the asset value of one whole share, in 18 decimals
    function _toShares(
        uint256 assets,
        uint256 price,
        Math.Rounding rounding
    ) private view returns (uint256) {
        return
            Math.mulDiv(
                assets,
                1e18 * _shareUnit,
                price * _assetUnit,
                rounding
            );
    }

    function _toAssets(uint256 shares, uint256 price)
        private
        view
        returns (uint256)
    {
        return Math.mulDiv(shares, price * _assetUnit, 1e18 * _shareUnit);
    }

    function setPrices(uint256 _mintPrice, uint256 _redeemPrice) external {
        mintPrice = _mintPrice;
        redeemPrice = _redeemPrice;
    }

    function setFeeRates(uint256 subscriptionRate, uint256 redemptionRate)
        external
    {
        _subscriptionFeeRate = subscriptionRate;
        _redemptionFeeRate = redemptionRate;
    }

    function setDepositReverts(bool value) external {
        depositReverts = value;
    }

    function setRedeemReverts(bool value) external {
        redeemReverts = value;
    }

    function setDepositReturnsZero(bool value) external {
        depositReturnsZero = value;
    }

    function setChargeFees(bool value) external {
        chargeFees = value;
    }

    function withdrawLiquidity(address to, uint256 amount) external {
        IERC20(asset).safeTransfer(to, amount);
    }

    function subscriptionFeeRate(address) external view returns (uint256) {
        return _subscriptionFeeRate;
    }

    function redemptionFeeRate(address) external view returns (uint256) {
        return _redemptionFeeRate;
    }

    function totalAssets() public view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        return _toShares(assets, redeemPrice, Math.Rounding.Down);
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        return _toAssets(shares, redeemPrice);
    }

    function maxRedeem(address account) public view returns (uint256) {
        return
            Math.min(
                IERC20(share).balanceOf(account),
                convertToShares(totalAssets())
            );
    }

    /// @dev subscription fee is taken from the deposited assets, rounding up
    function previewDepositData(address, uint256 assets)
        public
        view
        returns (
            uint256 shares,
            uint256 fee,
            int256 price
        )
    {
        if (chargeFees) {
            fee = Math.mulDiv(
                assets,
                _subscriptionFeeRate,
                1e18,
                Math.Rounding.Up
            );
        }
        shares = _toShares(assets - fee, mintPrice, Math.Rounding.Down);
        price = int256(mintPrice);
    }

    /// @dev shares needed so that redeeming them pays at least `assets` net of fee
    function previewWithdrawData(address, uint256 assets)
        external
        view
        returns (
            uint256 shares,
            uint256 fee,
            int256 price
        )
    {
        uint256 grossAssets = chargeFees
            ? Math.mulDiv(
                assets,
                1e18,
                1e18 - _redemptionFeeRate,
                Math.Rounding.Up
            )
            : assets;
        fee = grossAssets - assets;
        shares = _toShares(grossAssets, redeemPrice, Math.Rounding.Up);
        price = int256(redeemPrice);
    }

    /// @dev redemption fee is taken from the redeemed assets, rounding up
    function previewRedeemData(address, uint256 shares)
        public
        view
        returns (
            uint256 assets,
            uint256 fee,
            int256 price
        )
    {
        assets = convertToAssets(shares);
        if (chargeFees) {
            fee = Math.mulDiv(
                assets,
                _redemptionFeeRate,
                1e18,
                Math.Rounding.Up
            );
        }
        assets -= fee;
        price = int256(redeemPrice);
    }

    function deposit(uint256 assets, address receiver)
        external
        returns (uint256 shares)
    {
        require(!depositReverts, "USYCTellerMock: deposit reverts");

        (shares, , ) = previewDepositData(msg.sender, assets);
        if (shares == 0) revert ZeroShares();

        IERC20(asset).safeTransferFrom(msg.sender, address(this), assets);

        if (depositReturnsZero) return 0;

        ERC20Mock(share).mint(receiver, shares);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address account
    ) external returns (uint256 assets) {
        require(!redeemReverts, "USYCTellerMock: redeem reverts");
        if (account != msg.sender) revert NotPermissioned();

        uint256 maxShares = maxRedeem(account);
        if (shares > maxShares) revert ExceedsMaxRedeem(shares, maxShares);

        (assets, , ) = previewRedeemData(account, shares);
        if (assets == 0) revert ZeroAssets();

        ERC20Mock(share).burn(account, shares);
        IERC20(asset).safeTransfer(receiver, assets);
    }
}
