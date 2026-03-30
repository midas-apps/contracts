// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./DepositVault.sol";
import "./interfaces/IDepositVault.sol";

/**
 * @title DepositVaultWithMToken
 * @notice Smart contract that handles mToken minting and invests
 * proceeds into another mToken's DepositVault
 * @dev If `mTokenDepositsEnabled` is false, regular deposit flow is used
 * @author RedDuck Software
 */
contract DepositVaultWithMToken is DepositVault {
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice Target mToken DepositVault for auto-invest
     */
    IDepositVault public mTokenDepositVault;

    /**
     * @notice Whether mToken auto-invest deposits are enabled
     * @dev if false, regular deposit flow will be used
     */
    bool public mTokenDepositsEnabled;

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
     * @notice Emitted when the mToken DepositVault address is updated
     * @param caller address of the caller
     * @param newVault new mToken DepositVault address
     */
    event SetMTokenDepositVault(
        address indexed caller,
        address indexed newVault
    );

    /**
     * @notice Emitted when `mTokenDepositsEnabled` flag is updated
     * @param enabled Whether mToken deposits are enabled
     */
    event SetMTokenDepositsEnabled(bool indexed enabled);

    /**
     * @notice Emitted when `autoInvestFallbackEnabled` flag is updated
     * @param enabled Whether fallback to raw transfer is enabled
     */
    event SetAutoInvestFallbackEnabled(bool indexed enabled);

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations in mToken
     * @param _minMTokenAmountForFirstDeposit min amount for first deposit in mToken
     * @param _maxSupplyCap max supply cap for mToken
     * @param _mTokenDepositVault target mToken DepositVault address
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        uint256 _minMTokenAmountForFirstDeposit,
        uint256 _maxSupplyCap,
        address _mTokenDepositVault
    ) external {
        initialize(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _minMTokenAmountForFirstDeposit,
            _maxSupplyCap
        );

        _validateAddress(_mTokenDepositVault, true);
        mTokenDepositVault = IDepositVault(_mTokenDepositVault);
    }

    /**
     * @notice Sets the target mToken DepositVault address
     * @param _mTokenDepositVault new mToken DepositVault address
     */
    function setMTokenDepositVault(address _mTokenDepositVault)
        external
        onlyVaultAdmin
    {
        require(
            _mTokenDepositVault != address(mTokenDepositVault),
            "DVMT: already set"
        );
        _validateAddress(_mTokenDepositVault, true);
        mTokenDepositVault = IDepositVault(_mTokenDepositVault);
        emit SetMTokenDepositVault(msg.sender, _mTokenDepositVault);
    }

    /**
     * @notice Updates `mTokenDepositsEnabled` value
     * @param enabled whether mToken auto-invest deposits are enabled
     */
    function setMTokenDepositsEnabled(bool enabled) external onlyVaultAdmin {
        mTokenDepositsEnabled = enabled;
        emit SetMTokenDepositsEnabled(enabled);
    }

    /**
     * @notice Updates `autoInvestFallbackEnabled` value
     * @param enabled whether fallback to raw transfer is enabled on auto-invest failure
     */
    function setAutoInvestFallbackEnabled(bool enabled)
        external
        onlyVaultAdmin
    {
        autoInvestFallbackEnabled = enabled;
        emit SetAutoInvestFallbackEnabled(enabled);
    }

    /**
     * @dev overrides instant deposit transfer hook to auto-invest into target mToken DV
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        if (!mTokenDepositsEnabled) {
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
     * @dev overrides request deposit transfer hook to auto-invest into target mToken DV
     */
    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal override {
        if (!mTokenDepositsEnabled) {
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
     * into the target mToken DepositVault. On failure, either falls back
     * to raw transfer or reverts based on `autoInvestFallbackEnabled`.
     * @param tokenIn token address
     * @param amountToken amount of tokens to transfer in base18
     * @param tokensDecimals decimals of tokens
     */
    function _autoInvest(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) private {
        require(
            ManageableVault(address(mTokenDepositVault)).waivedFeeRestriction(
                address(this)
            ),
            "DVMT: fees not waived on target"
        );

        uint256 transferredAmount = _tokenTransferFromUser(
            tokenIn,
            address(this),
            amountToken,
            tokensDecimals
        );

        IERC20(tokenIn).safeIncreaseAllowance(
            address(mTokenDepositVault),
            transferredAmount
        );

        IERC20 targetMToken = IERC20(address(mTokenDepositVault.mToken()));
        uint256 balanceBefore = targetMToken.balanceOf(address(this));

        try
            mTokenDepositVault.depositInstant(
                tokenIn,
                amountToken,
                0,
                bytes32(0)
            )
        {
            uint256 mTokenReceived = targetMToken.balanceOf(address(this)) -
                balanceBefore;
            require(mTokenReceived > 0, "DVMT: zero mToken received");
            targetMToken.safeTransfer(tokensReceiver, mTokenReceived);
        } catch {
            if (autoInvestFallbackEnabled) {
                IERC20(tokenIn).safeApprove(address(mTokenDepositVault), 0);
                IERC20(tokenIn).safeTransfer(tokensReceiver, transferredAmount);
            } else {
                revert("DVMT: auto-invest failed");
            }
        }
    }
}
