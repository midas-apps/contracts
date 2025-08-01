// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IAcreAdapter} from "../../interfaces/acre/IAcreAdapter.sol";
import {ManageableVault, TokenConfig} from "../../abstract/ManageableVault.sol";
import {IDepositVault} from "../../interfaces/IDepositVault.sol";
import {IRedemptionVault} from "../../interfaces/IRedemptionVault.sol";
import {IDataFeed} from "../../interfaces/IDataFeed.sol";
import {DecimalsCorrectionLibrary} from "../../libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title AcreAdapter
 * @notice Wrapper for Midas Vaults to be used by Acre protocol
 */
contract AcreAdapter is IAcreAdapter {
    using SafeERC20 for IERC20;
    using DecimalsCorrectionLibrary for uint256;

    uint256 private constant _STABLECOIN_RATE = 10**18;
    uint256 private constant _ONE = 10**18;

    address public immutable depositVault;
    address public immutable redemptionVault;
    address public immutable mTokenDataFeed;
    uint256 public immutable assetTokenDecimals;

    address private immutable _mToken;
    address private immutable _assetToken;

    /**
     * @notice constructor
     * @param depositVault_ address of deposit vault contract (IDepositVault)
     * @param redemptionVault_ address of redemption vault contract (IRedemptionVault)
     * @param assetToken_ address of ERC20 asset token contract
     */
    constructor(
        address depositVault_,
        address redemptionVault_,
        address assetToken_
    ) {
        address _mTokenDv = address(ManageableVault(depositVault_).mToken());
        address _mTokenDataFeed = address(
            ManageableVault(depositVault_).mTokenDataFeed()
        );

        // validate that both vaults manages same mToken and uses same data feed
        require(
            _mTokenDv == address(ManageableVault(redemptionVault_).mToken()),
            "mToken mismatch"
        );
        require(
            _mTokenDataFeed ==
                address(ManageableVault(redemptionVault_).mTokenDataFeed()),
            "mTokenDataFeed mismatch"
        );

        depositVault = depositVault_;
        redemptionVault = redemptionVault_;
        _assetToken = assetToken_;
        _mToken = _mTokenDv;
        mTokenDataFeed = _mTokenDataFeed;
        assetTokenDecimals = IERC20Metadata(assetToken_).decimals();

        IERC20(assetToken_).safeApprove(depositVault_, type(uint256).max);
        IERC20(_mTokenDv).safeApprove(redemptionVault_, type(uint256).max);
    }

    /**
     * @inheritdoc IAcreAdapter
     */
    function deposit(uint256 assets, address receiver)
        external
        returns (uint256 shares)
    {
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);

        // calculate expected shares to mint to pass as slippage parameter
        // to avoid discrepancy between `convertToShares` and actual shares minted
        shares = _assetToMToken(assets);

        IDepositVault(depositVault).depositInstant(
            asset(),
            assets.convertToBase18(assetTokenDecimals),
            shares,
            bytes32(0),
            receiver
        );

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @inheritdoc IAcreAdapter
     */
    function requestRedeem(uint256 shares, address receiver)
        external
        returns (uint256 requestId)
    {
        // as we cannot use slippage parameter for redeem request
        // we need to validate that vault does not charge any fees upfront
        require(
            ManageableVault(redemptionVault).waivedFeeRestriction(
                address(this)
            ),
            "not fee waived"
        );

        IERC20(share()).safeTransferFrom(msg.sender, address(this), shares);

        requestId = IRedemptionVault(redemptionVault).redeemRequest(
            asset(),
            shares,
            receiver
        );

        emit RedeemRequest(requestId, msg.sender, receiver, shares);
    }

    /**
     * @inheritdoc IAcreAdapter
     */
    function convertToShares(uint256 assets) external view returns (uint256) {
        return _assetToMToken(assets);
    }

    /**
     * @inheritdoc IAcreAdapter
     */
    function convertToAssets(uint256 shares) external view returns (uint256) {
        return _mTokenToAsset(shares);
    }

    /**
     * @inheritdoc IAcreAdapter
     */
    function share() public view returns (address) {
        return _mToken;
    }

    /**
     * @inheritdoc IAcreAdapter
     */
    function asset() public view returns (address) {
        return _assetToken;
    }

    /**
     * @dev Internal mToken to asset conversion function
     */
    function _mTokenToAsset(uint256 mTokenAmount)
        internal
        view
        returns (uint256)
    {
        uint256 mTokenRate = _getTokenRate(mTokenDataFeed, false);
        require(mTokenRate > 0, "rate zero");

        (address dataFeed, bool stable) = _getTokenConfig(
            redemptionVault,
            asset()
        );

        uint256 tokenOutRate = _getTokenRate(dataFeed, stable);
        require(tokenOutRate > 0, "rate zero");

        uint256 amountTokenOut = ((mTokenAmount * mTokenRate) / tokenOutRate)
            .convertFromBase18(assetTokenDecimals);

        return amountTokenOut;
    }

    /**
     * @dev Internal asset to mToken conversion function
     */
    function _assetToMToken(uint256 assets) internal view returns (uint256) {
        uint256 amountTokenInBase18 = assets.convertToBase18(
            assetTokenDecimals
        );

        (address dataFeed, bool stable) = _getTokenConfig(
            depositVault,
            asset()
        );

        uint256 rate = _getTokenRate(dataFeed, stable);
        require(rate > 0, "rate zero");
        uint256 amountInUsd = (amountTokenInBase18 * rate) / (_ONE);

        uint256 mTokenRate = _getTokenRate(address(mTokenDataFeed), false);
        require(mTokenRate > 0, "rate zero");

        uint256 amountMToken = (amountInUsd * (_ONE)) / mTokenRate;

        return amountMToken;
    }

    /**
     * @dev get token rate depends on data feed and stablecoin flag
     * @param dataFeed address of dataFeed from token config
     * @param stable is stablecoin
     *
     * @return rate of token
     */
    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        virtual
        returns (uint256)
    {
        // if dataFeed returns rate, all peg checks passed
        uint256 rate = IDataFeed(dataFeed).getDataInBase18();
        if (stable) return _STABLECOIN_RATE;

        return rate;
    }

    /**
     * @dev get token config from vault
     * @param vault address of vault
     * @param token address of token
     *
     * @return dataFeed address of dataFeed from token config
     * @return stable is stablecoin (if true 1:1 rate should be used)
     */
    function _getTokenConfig(address vault, address token)
        internal
        view
        returns (address dataFeed, bool stable)
    {
        (dataFeed, , , stable) = ManageableVault(vault).tokensConfig(token);
    }
}
