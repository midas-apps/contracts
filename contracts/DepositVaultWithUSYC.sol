// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {ISuperstateToken} from "./interfaces/ustb/ISuperstateToken.sol";
import {CommonVaultInitParams} from "./interfaces/IManageableVault.sol";
import {IRedemptionVault} from "./interfaces/IRedemptionVault.sol";
import {DepositVault} from "./DepositVault.sol";
import {DepositVaultInitParams} from "./interfaces/IDepositVault.sol";
import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {IUSYCTeller} from "./interfaces/usyc/IUSYCTeller.sol";
import {ManageableVault} from "./abstract/ManageableVault.sol";

/**
 * @title DepositVaultWithUSTB
 * @notice Smart contract that handles mToken minting and invests
 * proceeds into USTB
 * @author RedDuck Software
 */
contract DepositVaultWithUSYC is DepositVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    IUSYCTeller public usycTeller;

    IRedemptionVault public redemptionVault;

    uint256 public anticipatedFeeRate;

    /**
     * @notice Whether USTB deposits are enabled
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
     * @notice Emitted when `usycDepositsEnabled` flag is updated
     * @param enabled Whether USTB deposits are enabled
     */
    event SetUsycDepositsEnabled(bool indexed enabled);

    event SetRedemptionVault(address indexed newRedemptionVault);

    event SetAutoInvestFallbackEnabled(bool indexed enabled);

    event SetUSYCTeller(address indexed newTeller);

    event SetAnticipatedFeeRate(uint256 _feeRate);

    /**
     * @notice when USTB token is not supported
     * @param token token address
     */
    error UnsupportedToken(address token);

    /**
     * @notice when USTB fee is not zero
     * @param fee fee
     */
    error USYCFeeNotZero(uint256 fee);

    error ZeroTokensReceived();

    /**
     * @notice when auto-invest fails
     * @param err error bytes
     */
    error AutoInvestFailed(bytes err);
    error FeeNotMatched(uint256 fee);
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
     * @param _usycTeller USTB token address
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

    function setUsycTeller(address _teller) external onlyContractAdmin {
        _validateAddress(_teller, false);
        usycTeller = IUSYCTeller(_teller);
        emit SetUSYCTeller(_teller);
    }

    /**
     * @notice Sets the target mToken DepositVault address
     * @param _redemptionVault new mToken DepositVault address
     */
    function setMTokenDepositVault(address _redemptionVault)
        external
        onlyContractAdmin
    {
        redemptionVault = IRedemptionVault(_redemptionVault);
        emit SetRedemptionVault(_redemptionVault);
    }

    function setAnticipatedFeeRate(uint256 _fee) external onlyContractAdmin {
        anticipatedFeeRate = _fee;
        emit SetAnticipatedFeeRate(_fee);
    }

    /**
     * @notice Updates `usycDepositsEnabled` value
     * @param enabled whether USTB deposits are enabled
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
     * @dev overrides instant deposit transfer hook to auto-invest into USTB
     * in case of USTB deposits are disabled, it will act as the original transfer
     * in case of invest token is not supported by USTB, it will revert
     * otherwise it will take payment tokens from user, invest them into USTB
     * and will transfer USTB to tokens receiver
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
     * @dev overrides request deposit transfer hook to auto-invest into the USTB
     * in case of USTB deposits are disabled, it will act as the original transfer
     * in case of invest token is not supported by USTB, it will revert
     * otherwise it will take payment tokens from user, invest them into USTB
     * and will transfer USTB to tokens receiver
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
     * @dev Transfers tokens from user to this contract and deposits them
     * into the USTB
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
        require(
            tellerFeeRate == anticipatedFeeRate,
            FeeNotMatched(tellerFeeRate)
        );

        IERC20(usdc).safeIncreaseAllowance(address(teller), assetAmount);

        try teller.deposit(assetAmount, address(this)) returns (
            uint256 usycReceived
        ) {
            require(usycReceived > 0, ZeroTokensReceived());
            IERC20(teller.share()).safeTransfer(tokensReceiver, usycReceived);
        } catch (bytes memory err) {
            if (autoInvestFallbackEnabled) {
                IERC20(usdc).safeApprove(address(teller), 0);
                IERC20(usdc).safeTransfer(tokensReceiver, assetAmount);
            } else {
                revert AutoInvestFailed(err);
            }
        }
    }
}
