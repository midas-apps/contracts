// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import {DepositVault} from "./DepositVault.sol";
import {ManageableVault} from "./abstract/ManageableVault.sol";
import {DepositVaultInitParams} from "./interfaces/IDepositVault.sol";
import {CommonVaultInitParams} from "./interfaces/IManageableVault.sol";
import {IRedemptionVault} from "./interfaces/IRedemptionVault.sol";
import {IUSYCTeller} from "./interfaces/usyc/IUSYCTeller.sol";

/**
 * @title DepositVaultWithUSYC
 * @notice Smart contract that handles mToken minting and invests
 * proceeds into USYC through the Circle USYC Teller
 * @dev Accepts either the Teller asset (USDC), which is subscribed to USYC
 * directly, or the mToken of `redemptionVault`, which is first redeemed
 * to USDC through that vault. Acquired USYC is sent to `tokensReceiver`.
 * If `usycDepositsEnabled` is false, regular deposit flow is used
 * @author RedDuck Software
 */
contract DepositVaultWithUSYC is DepositVault {
    using SafeERC20 for IERC20;

    /**
     * @notice Circle USYC Teller used to subscribe to USYC
     */
    IUSYCTeller public usycTeller;

    /**
     * @notice mToken RedemptionVault used to convert its mToken into USDC
     * before subscribing to USYC
     * @dev if not set, only USDC is accepted for auto-invest
     */
    IRedemptionVault public redemptionVault;

    /**
     * @notice Subscription fee rate the Teller is expected to charge this vault
     * @dev auto-invest is only performed when it equals
     * `usycTeller.subscriptionFeeRate(address(this))`
     */
    uint256 public anticipatedFeeRate;

    /**
     * @notice Whether USYC auto-invest deposits are enabled
     * @dev if false, regular deposit flow will be used
     */
    bool public usycDepositsEnabled;

    /**
     * @notice Whether to fall back to raw token transfer on auto-invest failure
     * @dev if false, the transaction will revert when auto-invest fails
     */
    bool public autoInvestFallbackEnabled;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when the USYC Teller address is updated
     * @param newTeller new USYC Teller address
     */
    event SetUsycTeller(address indexed newTeller);

    /**
     * @notice Emitted when the mToken RedemptionVault address is updated
     * @param newVault new mToken RedemptionVault address
     */
    event SetRedemptionVault(address indexed newVault);

    /**
     * @notice Emitted when `anticipatedFeeRate` is updated
     * @param feeRate new anticipated subscription fee rate
     */
    event SetAnticipatedFeeRate(uint256 feeRate);

    /**
     * @notice Emitted when `usycDepositsEnabled` flag is updated
     * @param enabled Whether USYC deposits are enabled
     */
    event SetUsycDepositsEnabled(bool indexed enabled);

    /**
     * @notice Emitted when `autoInvestFallbackEnabled` flag is updated
     * @param enabled Whether fallback to raw transfer is enabled
     */
    event SetAutoInvestFallbackEnabled(bool indexed enabled);

    /**
     * @notice when payment token is neither the Teller asset
     * nor the mToken of `redemptionVault`
     * @param token token address
     */
    error UnsupportedToken(address token);

    /**
     * @notice when the Teller mints zero USYC
     */
    error ZeroTokensReceived();

    /**
     * @notice when auto-invest fails
     * @param err error bytes
     */
    error AutoInvestFailed(bytes err);

    /**
     * @notice when the Teller subscription fee rate differs from `anticipatedFeeRate`
     * @param tellerFeeRate subscription fee rate reported by the Teller
     */
    error FeeNotMatched(uint256 tellerFeeRate);

    /**
     * @notice when this vault is not fee waived on `redemptionVault`
     */
    error FeesNotWaivedOnTarget();

    /**
     * @notice Passes role identifiers to the base DepositVault constructor
     * @param _contractAdminRole contract admin role identifier
     * @param _greenlistedRole greenlisted role identifier
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole)
        DepositVault(_contractAdminRole, _greenlistedRole)
    {}

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _depositVaultInitParams init params for deposit vault
     * @param _usycTeller USYC Teller address
     * @param _redemptionVault mToken RedemptionVault address, can be zero
     * @param _anticipatedFeeRate anticipated Teller subscription fee rate
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        DepositVaultInitParams calldata _depositVaultInitParams,
        address _usycTeller,
        address _redemptionVault,
        uint256 _anticipatedFeeRate
    ) external {
        initialize(_commonVaultInitParams, _depositVaultInitParams);

        _validateAddress(_usycTeller, false);

        usycTeller = IUSYCTeller(_usycTeller);
        redemptionVault = IRedemptionVault(_redemptionVault);
        anticipatedFeeRate = _anticipatedFeeRate;
    }

    /**
     * @notice Sets the USYC Teller address
     * @param _usycTeller new USYC Teller address
     */
    function setUsycTeller(address _usycTeller) external onlyContractAdmin {
        _validateAddress(_usycTeller, false);
        usycTeller = IUSYCTeller(_usycTeller);
        emit SetUsycTeller(_usycTeller);
    }

    /**
     * @notice Sets the mToken RedemptionVault address
     * @dev zero address disables mToken payment tokens for auto-invest
     * @param _redemptionVault new mToken RedemptionVault address
     */
    function setRedemptionVault(address _redemptionVault)
        external
        onlyContractAdmin
    {
        redemptionVault = IRedemptionVault(_redemptionVault);
        emit SetRedemptionVault(_redemptionVault);
    }

    /**
     * @notice Updates `anticipatedFeeRate` value
     * @param _feeRate new anticipated subscription fee rate
     */
    function setAnticipatedFeeRate(uint256 _feeRate)
        external
        onlyContractAdmin
    {
        anticipatedFeeRate = _feeRate;
        emit SetAnticipatedFeeRate(_feeRate);
    }

    /**
     * @notice Updates `usycDepositsEnabled` value
     * @param enabled whether USYC auto-invest deposits are enabled
     */
    function setUsycDepositsEnabled(bool enabled) external onlyContractAdmin {
        usycDepositsEnabled = enabled;
        emit SetUsycDepositsEnabled(enabled);
    }

    /**
     * @notice Updates `autoInvestFallbackEnabled` value
     * @param enabled whether fallback to raw transfer is enabled on auto-invest failure
     */
    function setAutoInvestFallbackEnabled(bool enabled)
        external
        onlyContractAdmin
    {
        autoInvestFallbackEnabled = enabled;
        emit SetAutoInvestFallbackEnabled(enabled);
    }

    /**
     * @dev overrides instant deposit transfer hook to auto-invest into USYC
     * in case of USYC deposits are disabled, it will act as the original transfer
     * in case of payment token is not supported, it will revert
     * otherwise it will take payment tokens from user, invest them into USYC
     * and will transfer USYC to tokens receiver
     *
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal virtual override {
        if (!usycDepositsEnabled) {
            return
                super._instantTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        _autoInvest(tokenIn, amountToken, tokensDecimals);
    }

    /**
     * @dev overrides request deposit transfer hook to auto-invest into USYC
     * in case of USYC deposits are disabled, it will act as the original transfer
     * in case of payment token is not supported, it will revert
     * otherwise it will take payment tokens from user, invest them into USYC
     * and will transfer USYC to tokens receiver
     *
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal virtual override {
        if (!usycDepositsEnabled) {
            return
                super._requestTransferTokensToTokensReceiver(
                    tokenIn,
                    amountToken,
                    tokensDecimals
                );
        }

        _autoInvest(tokenIn, amountToken, tokensDecimals);
    }

    /**
     * @dev Transfers tokens from user to this contract, redeems them to USDC
     * through `redemptionVault` if `tokenIn` is its mToken, and subscribes
     * to USYC with the USDC. Falls back to sending USDC to `tokensReceiver`
     * or reverts, based on `autoInvestFallbackEnabled`, when the Teller fee rate
     * differs from `anticipatedFeeRate` or the Teller deposit fails.
     * Failures of the `redemptionVault` redemption always revert
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _autoInvest(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) private {
        IUSYCTeller teller = usycTeller;
        IRedemptionVault rv = redemptionVault;
        address usdc = teller.asset();
        bool isMToken = address(rv) != address(0)
            ? address(rv.mToken()) == tokenIn
            : false;

        require(tokenIn == usdc || isMToken, UnsupportedToken(tokenIn));

        uint256 assetAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        if (isMToken) {
            require(
                ManageableVault(address(rv)).waivedFeeRestriction(
                    address(this)
                ),
                FeesNotWaivedOnTarget()
            );

            assetAmount = rv.redeemInstant(usdc, amountToken, 0);
        }

        uint256 tellerFeeRate = teller.subscriptionFeeRate(address(this));

        bool _autoInvestFallbackEnabled = autoInvestFallbackEnabled;

        if (tellerFeeRate != anticipatedFeeRate) {
            _fallbackDeposit(
                abi.encodeWithSelector(FeeNotMatched.selector, tellerFeeRate),
                teller,
                usdc,
                assetAmount,
                _autoInvestFallbackEnabled
            );
            return;
        }

        IERC20(usdc).safeIncreaseAllowance(address(teller), assetAmount);

        try teller.deposit(assetAmount, tokensReceiver) returns (
            uint256 usycReceived
        ) {
            require(usycReceived > 0, ZeroTokensReceived());
        } catch (bytes memory err) {
            _fallbackDeposit(
                err,
                teller,
                usdc,
                assetAmount,
                _autoInvestFallbackEnabled
            );
        }
    }

    /**
     * @dev Sends `_assetAmount` of USDC to `tokensReceiver` and resets the
     * Teller allowance if fallback is enabled, otherwise reverts
     * @param err error bytes of the failed auto-invest
     * @param _teller USYC Teller
     * @param _usdc Teller asset address
     * @param _assetAmount amount of USDC to send, in USDC decimals
     * @param _autoInvestFallbackEnabled whether fallback is enabled
     */
    function _fallbackDeposit(
        bytes memory err,
        IUSYCTeller _teller,
        address _usdc,
        uint256 _assetAmount,
        bool _autoInvestFallbackEnabled
    ) private {
        if (_autoInvestFallbackEnabled) {
            IERC20(_usdc).safeApprove(address(_teller), 0);
            IERC20(_usdc).safeTransfer(tokensReceiver, _assetAmount);
        } else {
            revert AutoInvestFailed(err);
        }
    }
}
