// solhint-disable
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IMintableBurnableToken {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}

/// @notice subset of Circle's USYC oracle (GenericNextPriceAggregator)
interface IUSYCOracle {
    function decimals() external view returns (uint8);

    function nextPrice() external view returns (int256);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @notice Mock of Circle's USYC Teller with its TellerFeeManager.
 * Share/asset conversions follow the Teller:
 * - asset and share have the same decimals, prices have `PRICE_DECIMALS`
 * - deposit: the fee is taken from `assets`,
 *   shares = (assets - fee) / mintPrice, rounded down
 * - previewWithdrawData: the fee is added on top of `assets`,
 *   shares = (assets + fee) / price, rounded up
 * - redeem: assets = shares * price, rounded down, then the fee is taken from it
 * - convertToShares, convertToAssets and maxRedeem use `price`, rounded down
 *
 * Fees follow the TellerFeeManager: the rate applies to the net amount and only
 * to the part of the amount over the free tier left for the day, where the daily
 * volume is the account subscriptions + redemptions. By default the free tier is
 * unlimited, so the fee rates are reported but no fee is charged
 *
 * Simplifications:
 * - prices come from the optional `oracle`: `price` is `latestRoundData().answer`,
 *   `mintPrice` is `latestRoundData().answer` before `mintPriceCutoff` (UTC time
 *   of day) and `nextPrice()` after it. The Teller switches at 14:00 ET, the mock
 *   uses a fixed UTC time that has to be moved by an hour on DST changes.
 *   `setPrices` overrides the oracle until `clearPricesOverride` is called;
 *   without an oracle the prices set by `setPrices` (1.0 by default) are used
 * - fee rates are the same for all accounts
 * - the mock holds the redemption liquidity itself, there are no daily limits
 *   and `redeem` only burns the caller's own shares
 *
 * @dev admin functions are gated by the owner, or permissionless when the owner is address(0)
 */
contract USYCTellerMock is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant PRICE_DECIMALS = 18;
    uint256 private constant _PRICE_SCALE = 10**PRICE_DECIMALS;
    /// @dev fee rates have 18 decimals of a percent: 1e18 = 1%
    uint256 private constant _HUNDRED_PCT = 100e18;

    address public immutable asset;
    address public immutable share;

    address public oracle;
    bool public pricesOverridden;
    /// @dev UTC time of day from which `mintPrice` is `nextPrice()`, 14:00 EST by default
    uint256 public mintPriceCutoff = 19 hours;

    uint256 private _price = _PRICE_SCALE;
    uint256 private _mintPrice = _PRICE_SCALE;

    uint256 private _subscriptionFeeRate;
    uint256 private _redemptionFeeRate;

    uint256 public freeTierThreshold = type(uint256).max;

    mapping(address => mapping(uint256 => uint256)) public subscription;

    mapping(address => mapping(uint256 => uint256)) public redemption;

    bool public depositReverts;
    bool public redeemReverts;
    bool public depositReturnsZero;

    modifier onlyAdmin() {
        if (owner() != address(0)) _checkOwner();
        _;
    }

    constructor(
        address _asset,
        address _share,
        address _oracle,
        address _owner
    ) {
        require(
            IERC20Metadata(_asset).decimals() ==
                IERC20Metadata(_share).decimals(),
            "USYCTellerMock: bad decimals"
        );
        asset = _asset;
        share = _share;
        _setOracle(_oracle);
        _transferOwnership(_owner);
    }

    function transferOwnership(address newOwner) public override onlyAdmin {
        _transferOwnership(newOwner);
    }

    /// @param oracle_ USYC oracle, address(0) to use the prices set by `setPrices`
    function setOracle(address oracle_) external onlyAdmin {
        _setOracle(oracle_);
    }

    /// @notice overrides the oracle prices until `clearPricesOverride` is called
    function setPrices(uint256 mintPrice_, uint256 price_) external onlyAdmin {
        require(mintPrice_ > 0 && price_ > 0, "USYCTellerMock: bad price");
        _mintPrice = mintPrice_;
        _price = price_;
        pricesOverridden = true;
    }

    function clearPricesOverride() external onlyAdmin {
        pricesOverridden = false;
    }

    /// @param cutoff UTC time of day in seconds, e.g. `18 hours` for 14:00 EDT
    function setMintPriceCutoff(uint256 cutoff) external onlyAdmin {
        require(cutoff < 1 days, "USYCTellerMock: bad cutoff");
        mintPriceCutoff = cutoff;
    }

    function setFeeRates(uint256 subscriptionRate, uint256 redemptionRate)
        external
        onlyAdmin
    {
        _subscriptionFeeRate = subscriptionRate;
        _redemptionFeeRate = redemptionRate;
    }

    function setFreeTierThreshold(uint256 threshold) external onlyAdmin {
        freeTierThreshold = threshold;
    }

    function setDepositReverts(bool value) external onlyAdmin {
        depositReverts = value;
    }

    function setRedeemReverts(bool value) external onlyAdmin {
        redeemReverts = value;
    }

    function setDepositReturnsZero(bool value) external onlyAdmin {
        depositReturnsZero = value;
    }

    function withdrawLiquidity(address to, uint256 amount) external onlyAdmin {
        IERC20(asset).safeTransfer(to, amount);
    }

    function deposit(uint256 assets, address receiver)
        external
        returns (uint256 shares)
    {
        require(!depositReverts, "USYCTellerMock: deposit reverts");

        uint256 fee;
        (shares, fee, ) = previewDepositData(msg.sender, assets);
        require(shares > 0, "USYCTellerMock: zero shares");

        subscription[msg.sender][todayTimestamp()] += assets - fee;

        IERC20(asset).safeTransferFrom(msg.sender, address(this), assets);

        if (depositReturnsZero) return 0;

        IMintableBurnableToken(share).mint(receiver, shares);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address account
    ) external returns (uint256 assets) {
        require(!redeemReverts, "USYCTellerMock: redeem reverts");
        require(account == msg.sender, "USYCTellerMock: not permissioned");
        require(
            shares <= maxRedeem(account),
            "USYCTellerMock: exceeds max redeem"
        );

        (assets, , ) = previewRedeemData(account, shares);
        require(assets > 0, "USYCTellerMock: zero assets");

        redemption[account][todayTimestamp()] += assets;

        IMintableBurnableToken(share).burn(account, shares);
        IERC20(asset).safeTransfer(receiver, assets);
    }

    function mintPrice() public view returns (int256) {
        if (!_useOracle()) return int256(_mintPrice);

        if (block.timestamp % 1 days >= mintPriceCutoff) {
            return IUSYCOracle(oracle).nextPrice();
        }
        (, int256 answer, , , ) = IUSYCOracle(oracle).latestRoundData();
        return answer;
    }

    function price() public view returns (uint256) {
        if (!_useOracle()) return _price;

        (, int256 answer, , , ) = IUSYCOracle(oracle).latestRoundData();
        return _toPrice(answer);
    }

    function subscriptionFeeRate(address) external view returns (uint256) {
        return _subscriptionFeeRate;
    }

    function redemptionFeeRate(address) external view returns (uint256) {
        return _redemptionFeeRate;
    }

    function treasury(address) external view returns (address) {
        return address(this);
    }

    function todayTimestamp() public view returns (uint256) {
        return block.timestamp - (block.timestamp % 1 days);
    }

    function totalAssets() public view returns (uint256) {
        return IERC20(asset).balanceOf(address(this));
    }

    function convertToShares(uint256 assets) external view returns (uint256) {
        return Math.mulDiv(assets, _PRICE_SCALE, price());
    }

    function convertToAssets(uint256 shares) external view returns (uint256) {
        return Math.mulDiv(shares, price(), _PRICE_SCALE);
    }

    function maxRedeem(address account) public view returns (uint256) {
        return
            Math.min(
                Math.mulDiv(totalAssets(), _PRICE_SCALE, price()),
                IERC20(share).balanceOf(account)
            );
    }

    function previewDepositData(address account, uint256 assets)
        public
        view
        returns (
            uint256 shares,
            uint256 fee,
            int256 price_
        )
    {
        fee = _feeFromGross(account, assets, _subscriptionFeeRate);
        price_ = mintPrice();
        shares = Math.mulDiv(assets - fee, _PRICE_SCALE, _toPrice(price_));
    }

    function previewWithdrawData(address account, uint256 assets)
        external
        view
        returns (
            uint256 shares,
            uint256 fee,
            int256 price_
        )
    {
        fee = _feeOnTop(account, assets, _redemptionFeeRate);
        uint256 currentPrice = price();
        price_ = int256(currentPrice);
        shares = Math.mulDiv(
            assets + fee,
            _PRICE_SCALE,
            currentPrice,
            Math.Rounding.Up
        );
    }

    function previewRedeemData(address account, uint256 shares)
        public
        view
        returns (
            uint256 assets,
            uint256 fee,
            int256 price_
        )
    {
        uint256 currentPrice = price();
        price_ = int256(currentPrice);
        assets = Math.mulDiv(shares, currentPrice, _PRICE_SCALE);
        fee = _feeFromGross(account, assets, _redemptionFeeRate);
        assets -= fee;
    }

    function _setOracle(address oracle_) private {
        require(
            oracle_ == address(0) ||
                IUSYCOracle(oracle_).decimals() == PRICE_DECIMALS,
            "USYCTellerMock: bad oracle decimals"
        );
        oracle = oracle_;
    }

    function _useOracle() private view returns (bool) {
        return oracle != address(0) && !pricesOverridden;
    }

    function _toPrice(int256 answer) private pure returns (uint256) {
        require(answer > 0, "USYCTellerMock: bad price");
        return uint256(answer);
    }

    function _feeFromGross(
        address account,
        uint256 grossAssets,
        uint256 rate
    ) private view returns (uint256 fee) {
        uint256 amountOverFreeTier = _amountOverFreeTier(account, grossAssets);

        if (rate > 0 && amountOverFreeTier > 0) {
            fee =
                amountOverFreeTier -
                Math.mulDiv(
                    amountOverFreeTier,
                    _HUNDRED_PCT,
                    _HUNDRED_PCT + rate
                );
        }
    }

    function _feeOnTop(
        address account,
        uint256 netAssets,
        uint256 rate
    ) private view returns (uint256 fee) {
        uint256 amountOverFreeTier = _amountOverFreeTier(account, netAssets);

        if (rate > 0 && amountOverFreeTier > 0) {
            fee = Math.mulDiv(
                amountOverFreeTier,
                rate,
                _HUNDRED_PCT,
                Math.Rounding.Up
            );
        }
    }

    function _amountOverFreeTier(address account, uint256 assets)
        private
        view
        returns (uint256)
    {
        uint256 today = todayTimestamp();
        uint256 currentVolume = subscription[account][today] +
            redemption[account][today];
        if (currentVolume >= freeTierThreshold) return assets;

        uint256 freeTierVolLeft = freeTierThreshold - currentVolume;
        if (assets >= freeTierVolLeft) return assets - freeTierVolLeft;

        return 0;
    }
}
