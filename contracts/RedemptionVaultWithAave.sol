// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

import "./RedemptionVault.sol";

import "./interfaces/aave/IAaveV3Pool.sol";
import "./libraries/DecimalsCorrectionLibrary.sol";

/**
 * @title RedemptionVaultWithAave
 * @notice Smart contract that handles redemptions using Aave V3 Pool withdrawals
 * @dev When the vault has insufficient payment token balance, it withdraws from
 * an Aave V3 Pool by burning its aTokens to obtain the underlying asset.
 * @author RedDuck Software
 */
contract RedemptionVaultWithAave is RedemptionVault {
    using DecimalsCorrectionLibrary for uint256;

    /**
     * @notice Aave V3 Pool contract used for withdrawals
     */
    IAaveV3Pool public aavePool;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Emitted when the Aave Pool address is updated
     * @param caller address of the caller
     * @param newPool new Aave Pool address
     */
    event SetAavePool(address indexed caller, address indexed newPool);

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _ac address of MidasAccessControll contract
     * @param _mTokenInitParams init params for mToken
     * @param _receiversInitParams init params for receivers
     * @param _instantInitParams init params for instant operations
     * @param _sanctionsList address of sanctionsList contract
     * @param _variationTolerance percent of prices diviation 1% = 100
     * @param _minAmount basic min amount for operations
     * @param _fiatRedemptionInitParams params fiatAdditionalFee, fiatFlatFee, minFiatRedeemAmount
     * @param _requestRedeemer address is designated for standard redemptions, allowing tokens to be pulled from this address
     * @param _aavePool Aave V3 Pool contract address
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        FiatRedeptionInitParams calldata _fiatRedemptionInitParams,
        address _requestRedeemer,
        address _aavePool
    ) external initializer {
        __RedemptionVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _fiatRedemptionInitParams,
            _requestRedeemer
        );
        _validateAddress(_aavePool, false);
        aavePool = IAaveV3Pool(_aavePool);
    }

    /**
     * @notice Sets the Aave V3 Pool address
     * @param _aavePool new Aave V3 Pool address
     */
    function setAavePool(address _aavePool) external onlyVaultAdmin {
        _validateAddress(_aavePool, false);
        aavePool = IAaveV3Pool(_aavePool);
        emit SetAavePool(msg.sender, _aavePool);
    }

    /**
     * @dev Redeem mToken to the selected payment token if daily limit and allowance are not exceeded.
     * If the contract doesn't have enough payment token, the Aave V3 withdrawal flow will be
     * triggered to withdraw the missing amount from the Aave Pool.
     * Burns mToken from the user.
     * Transfers fee in mToken to feeReceiver.
     * Transfers tokenOut to user.
     * @param tokenOut token out address
     * @param amountMTokenIn amount of mToken to redeem
     * @param minReceiveAmount minimum expected amount of tokenOut to receive (decimals 18)
     * @param recipient address that will receive the tokenOut
     */
    function _redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    )
        internal
        override
        returns (
            CalcAndValidateRedeemResult memory calcResult,
            uint256 amountTokenOutWithoutFee
        )
    {
        address user = msg.sender;

        calcResult = _calcAndValidateRedeem(
            user,
            tokenOut,
            amountMTokenIn,
            true,
            false
        );

        _requireAndUpdateLimit(amountMTokenIn);

        uint256 tokenDecimals = _tokenDecimals(tokenOut);

        uint256 amountMTokenInCopy = amountMTokenIn;
        address tokenOutCopy = tokenOut;
        uint256 minReceiveAmountCopy = minReceiveAmount;

        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(
            amountMTokenInCopy
        );
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(
            amountMTokenInUsd,
            tokenOutCopy
        );

        _requireAndUpdateAllowance(tokenOutCopy, amountTokenOut);

        mToken.burn(user, calcResult.amountMTokenWithoutFee);
        if (calcResult.feeAmount > 0)
            _tokenTransferFromUser(
                address(mToken),
                feeReceiver,
                calcResult.feeAmount,
                18
            );

        uint256 amountTokenOutWithoutFeeFrom18 = ((calcResult
            .amountMTokenWithoutFee * mTokenRate) / tokenOutRate)
            .convertFromBase18(tokenDecimals);

        amountTokenOutWithoutFee = amountTokenOutWithoutFeeFrom18
            .convertToBase18(tokenDecimals);

        require(
            amountTokenOutWithoutFee >= minReceiveAmountCopy,
            "RVA: minReceiveAmount > actual"
        );

        _checkAndRedeemAave(tokenOutCopy, amountTokenOutWithoutFeeFrom18);

        _tokenTransferToUser(
            tokenOutCopy,
            recipient,
            amountTokenOutWithoutFee,
            tokenDecimals
        );
    }

    /**
     * @notice Check if contract has enough tokenOut balance for redeem;
     * if not, withdraw the missing amount from the Aave V3 Pool
     * @dev The Aave Pool burns the vault's aTokens and transfers the underlying
     * asset directly to this contract. No approval is needed because the Pool
     * burns aTokens from msg.sender (this contract) internally.
     * @param tokenOut tokenOut address
     * @param amountTokenOut amount of tokenOut needed
     */
    function _checkAndRedeemAave(address tokenOut, uint256 amountTokenOut)
        internal
    {
        uint256 contractBalanceTokenOut = IERC20(tokenOut).balanceOf(
            address(this)
        );
        if (contractBalanceTokenOut >= amountTokenOut) return;

        uint256 missingAmount = amountTokenOut - contractBalanceTokenOut;

        address aToken = aavePool.getReserveData(tokenOut).aTokenAddress;
        require(aToken != address(0), "RVA: token not in Aave pool");

        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));
        require(
            aTokenBalance >= missingAmount,
            "RVA: insufficient aToken balance"
        );

        aavePool.withdraw(tokenOut, missingAmount, address(this));
    }
}
