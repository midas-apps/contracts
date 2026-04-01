// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {IRedemptionVault, CommonVaultInitParams, CommonVaultV2InitParams, LiquidityProviderLoanRequest, Request, RequestV2, RequestStatus, RedemptionVaultInitParams, RedemptionVaultV2InitParams} from "./interfaces/IRedemptionVault.sol";
import {ManageableVault} from "./abstract/ManageableVault.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mToken redemptions
 * @author RedDuck Software
 */
contract RedemptionVault is ManageableVault, IRedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
    using Counters for Counters.Counter;
    using SafeERC20 for IERC20;
    /**
     * @notice return data of _calcAndValidateRedeem
     * packed into a struct to avoid stack too deep errors
     */
    struct CalcAndValidateRedeemResult {
        /// @notice fee amount in paymentToken
        uint256 feeAmount;
        /// @notice amount of paymentToken without fee
        uint256 amountTokenOutWithoutFee;
        /// @notice amount of paymentToken with fee
        uint256 amountTokenOut;
        /// @notice payment token rate
        uint256 tokenOutRate;
        /// @notice mToken rate
        uint256 mTokenRate;
        /// @notice tokenOut decimals
        uint256 tokenOutDecimals;
    }

    /**
     * @dev default role that grants admin rights to the contract
     * keccak256("REDEMPTION_VAULT_ADMIN_ROLE")
     */
    bytes32 private constant _DEFAULT_REDEMPTION_VAULT_ADMIN_ROLE =
        0x57df534b215589c7ade8c8abe0978debf2ea95cf1d442550f94eec78a69d238e;

    /**
     * @notice min amount for fiat requests
     */
    uint256 public minFiatRedeemAmount;

    /**
     * @notice fee percent for fiat requests
     */
    uint256 public fiatAdditionalFee;

    /**
     * @notice static fee in mToken for fiat requests
     */
    uint256 public fiatFlatFee;

    /**
     * @notice mapping, requestId to request data
     * @custom:oz-retyped-from Request
     */
    mapping(uint256 => RequestV2) public redeemRequests;

    /**
     * @notice address is designated for standard redemptions, allowing tokens to be pulled from this address
     */
    address public requestRedeemer;

    /**
     * @notice address of loan liquidity provider
     */
    address public loanLp;

    /**
     * @notice address of loan liquidity provider fee receiver
     */
    address public loanLpFeeReceiver;

    /**
     * @notice address from which payment tokens will be pulled during loan repayment
     */
    address public loanRepaymentAddress;

    /**
     * @notice address of loan RedemptionVault-compatible vault
     */
    IRedemptionVault public loanSwapperVault;

    /**
     * @notice last loan request id
     */
    Counters.Counter public currentLoanRequestId;

    /**
     * @notice mapping, loanRequestId to loan request data
     */
    mapping(uint256 => LiquidityProviderLoanRequest) public loanRequests;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[44] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _commonVaultV2InitParams init params for common vault v2
     * @param _redemptionVaultInitParams init params for redemption vault
     * @param _redemptionVaultV2InitParams init params for redemption vault v2
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        CommonVaultV2InitParams calldata _commonVaultV2InitParams,
        RedemptionVaultInitParams calldata _redemptionVaultInitParams,
        RedemptionVaultV2InitParams calldata _redemptionVaultV2InitParams
    ) public {
        _initializeV1(_commonVaultInitParams, _redemptionVaultInitParams);
        initializeV2(_commonVaultV2InitParams, _redemptionVaultV2InitParams);
    }

    /**
     * @notice v1 initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _redemptionInitParams init params for redemption vault
     */
    function _initializeV1(
        CommonVaultInitParams calldata _commonVaultInitParams,
        RedemptionVaultInitParams calldata _redemptionInitParams
    ) private initializer {
        __ManageableVault_init(_commonVaultInitParams);
        _validateFee(_redemptionInitParams.fiatAdditionalFee, false);
        _validateAddress(_redemptionInitParams.requestRedeemer, false);

        fiatAdditionalFee = _redemptionInitParams.fiatAdditionalFee;
        fiatFlatFee = _redemptionInitParams.fiatFlatFee;
        minFiatRedeemAmount = _redemptionInitParams.minFiatRedeemAmount;
        requestRedeemer = _redemptionInitParams.requestRedeemer;
    }

    /**
     * @notice v2 initializer
     * @param _redemptionVaultV2InitParams init params for redemption vault v2
     */
    function initializeV2(
        CommonVaultV2InitParams calldata _commonVaultV2InitParams,
        RedemptionVaultV2InitParams calldata _redemptionVaultV2InitParams
    ) public reinitializer(2) {
        __ManageableVault_initV2(_commonVaultV2InitParams);
        loanLp = _redemptionVaultV2InitParams.loanLp;
        loanLpFeeReceiver = _redemptionVaultV2InitParams.loanLpFeeReceiver;
        loanRepaymentAddress = _redemptionVaultV2InitParams
            .loanRepaymentAddress;
        loanSwapperVault = IRedemptionVault(
            _redemptionVaultV2InitParams.loanSwapperVault
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount
    ) external {
        _redeemInstantWithCustomRecipient(
            tokenOut,
            amountMTokenIn,
            minReceiveAmount,
            msg.sender
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    ) external {
        _redeemInstantWithCustomRecipient(
            tokenOut,
            amountMTokenIn,
            minReceiveAmount,
            recipient
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(address tokenOut, uint256 amountMTokenIn)
        external
        returns (
            uint256 /*requestId*/
        )
    {
        return
            _redeemRequestWithCustomRecipient(
                tokenOut,
                amountMTokenIn,
                msg.sender,
                false
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipient
    )
        external
        returns (
            uint256 /*requestId*/
        )
    {
        return
            _redeemRequestWithCustomRecipient(
                tokenOut,
                amountMTokenIn,
                recipient,
                false
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemFiatRequest(uint256 amountMTokenIn)
        external
        returns (
            uint256 /*requestId*/
        )
    {
        return
            _redeemRequestWithCustomRecipient(
                MANUAL_FULLFILMENT_TOKEN,
                amountMTokenIn,
                msg.sender,
                true
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external
        validateVaultAdminAccess
    {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            uint256 rate = redeemRequests[requestIds[i]].mTokenRate;
            bool success = _approveRequest(requestIds[i], rate, true, true);

            if (!success) {
                continue;
            }
        }
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(uint256[] calldata requestIds) external {
        uint256 currentMTokenRate = _getMTokenRate();
        _safeBulkApproveRequest(requestIds, currentMTokenRate);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        validateVaultAdminAccess
    {
        _approveRequest(requestId, newMTokenRate, false, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        validateVaultAdminAccess
    {
        _approveRequest(requestId, newMTokenRate, true, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function rejectRequest(uint256 requestId)
        external
        validateVaultAdminAccess
    {
        RequestV2 memory request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        redeemRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function bulkRepayLpLoanRequest(uint256[] calldata requestIds)
        external
        validateVaultAdminAccess
    {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            LiquidityProviderLoanRequest memory request = loanRequests[
                requestIds[i]
            ];

            _validateRequest(request.tokenOut, request.status);

            uint256 decimals = _tokenDecimals(request.tokenOut);

            _tokenTransferFromTo(
                request.tokenOut,
                loanRepaymentAddress,
                loanLp,
                request.amountTokenOut,
                decimals
            );

            if (request.amountFee > 0) {
                require(
                    loanLpFeeReceiver != address(0),
                    "RV: !loanLpFeeReceiver"
                );
                _tokenTransferFromTo(
                    request.tokenOut,
                    loanRepaymentAddress,
                    loanLpFeeReceiver,
                    request.amountFee,
                    decimals
                );
            }

            loanRequests[requestIds[i]].status = RequestStatus.Processed;
            emit RepayLpLoanRequest(msg.sender, requestIds[i]);
        }
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function cancelLpLoanRequest(uint256 requestId)
        external
        validateVaultAdminAccess
    {
        LiquidityProviderLoanRequest memory request = loanRequests[requestId];

        _validateRequest(request.tokenOut, request.status);

        loanRequests[requestId].status = RequestStatus.Canceled;
        emit CancelLpLoanRequest(msg.sender, requestId);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setMinFiatRedeemAmount(uint256 newValue)
        external
        validateVaultAdminAccess
    {
        minFiatRedeemAmount = newValue;

        emit SetMinFiatRedeemAmount(msg.sender, newValue);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setFiatFlatFee(uint256 feeInMToken)
        external
        validateVaultAdminAccess
    {
        fiatFlatFee = feeInMToken;

        emit SetFiatFlatFee(msg.sender, feeInMToken);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setFiatAdditionalFee(uint256 newFee)
        external
        validateVaultAdminAccess
    {
        _validateFee(newFee, false);

        fiatAdditionalFee = newFee;

        emit SetFiatAdditionalFee(msg.sender, newFee);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setRequestRedeemer(address redeemer)
        external
        validateVaultAdminAccess
    {
        _validateAddress(redeemer, false);

        requestRedeemer = redeemer;

        emit SetRequestRedeemer(msg.sender, redeemer);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanLp(address newLoanLp) external validateVaultAdminAccess {
        loanLp = newLoanLp;

        emit SetLoanLp(msg.sender, newLoanLp);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanLpFeeReceiver(address newLoanLpFeeReceiver)
        external
        validateVaultAdminAccess
    {
        loanLpFeeReceiver = newLoanLpFeeReceiver;

        emit SetLoanLpFeeReceiver(msg.sender, newLoanLpFeeReceiver);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanRepaymentAddress(address newLoanRepaymentAddress)
        external
        validateVaultAdminAccess
    {
        loanRepaymentAddress = newLoanRepaymentAddress;

        emit SetLoanRepaymentAddress(msg.sender, newLoanRepaymentAddress);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanSwapperVault(address newLoanSwapperVault)
        external
        validateVaultAdminAccess
    {
        loanSwapperVault = IRedemptionVault(newLoanSwapperVault);

        emit SetLoanSwapperVault(msg.sender, newLoanSwapperVault);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) external {
        _safeBulkApproveRequest(requestIds, newOutRate);
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return _DEFAULT_REDEMPTION_VAULT_ADMIN_ROLE;
    }

    /**
     * @dev internal function to approve requests
     * @param requestIds request ids
     * @param newOutRate new out rate
     */
    function _safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) internal validateVaultAdminAccess {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            bool success = _approveRequest(
                requestIds[i],
                newOutRate,
                true,
                true
            );

            if (!success) {
                continue;
            }
        }
    }

    /**
     * @dev validates approve
     * burns amount from contract
     * transfer tokenOut to user if not fiat
     * sets flag Processed
     * @param requestId request id
     * @param newMTokenRate new mToken rate
     * @param isSafe new mToken rate
     * @param safeValidateLiquidity if true, checks if there is enough liquidity
     * and if its not sufficient, function wont fail
     *
     * @return success true if success, false only in case if
     * safeValidateLiquidity == true and there is not enough liquidity
     */
    function _approveRequest(
        uint256 requestId,
        uint256 newMTokenRate,
        bool isSafe,
        bool safeValidateLiquidity
    )
        internal
        returns (
            bool /* success */
        )
    {
        RequestV2 memory request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        require(request.version == 1, "RV: not v2 request");

        if (isSafe) {
            _requireVariationTolerance(request.mTokenRate, newMTokenRate);
        }

        bool isFiat = request.tokenOut == MANUAL_FULLFILMENT_TOKEN;

        CalcAndValidateRedeemResult memory calcResult = _calcAndValidateRedeem(
            request.sender,
            request.tokenOut,
            request.amountMToken,
            newMTokenRate,
            request.tokenOutRate,
            true,
            request.feePercent,
            false,
            isFiat
        );

        if (!isFiat) {
            if (
                safeValidateLiquidity &&
                !_validateLiquidity(
                    request.tokenOut,
                    calcResult.amountTokenOutWithoutFee + calcResult.feeAmount,
                    calcResult.tokenOutDecimals
                )
            ) {
                return false;
            }

            _tokenTransferFromTo(
                request.tokenOut,
                requestRedeemer,
                request.sender,
                calcResult.amountTokenOutWithoutFee,
                calcResult.tokenOutDecimals
            );

            _tokenTransferFromTo(
                request.tokenOut,
                requestRedeemer,
                feeReceiver,
                calcResult.feeAmount,
                calcResult.tokenOutDecimals
            );
        }

        _requireAndUpdateAllowance(
            request.tokenOut,
            calcResult.amountTokenOutWithoutFee
        );

        mToken.burn(requestRedeemer, request.amountMToken);

        request.status = RequestStatus.Processed;
        request.mTokenRate = newMTokenRate;
        redeemRequests[requestId] = request;

        emit ApproveRequest(requestId, newMTokenRate, isSafe);

        return true;
    }

    /**
     * @notice validates request
     * if exist
     * if not processed
     * @param validateAddress address to check if not zero
     * @param status request status
     */
    function _validateRequest(address validateAddress, RequestStatus status)
        internal
        pure
    {
        require(validateAddress != address(0), "RV: request not exist");
        require(status == RequestStatus.Pending, "RV: request not pending");
    }

    /**
     * @dev internal redeem instant logic with custom recipient

     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param minReceiveAmount min amount of tokenOut to receive (decimals 18)
     * @param recipient recipient address
     */
    function _redeemInstantWithCustomRecipient(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient
    ) private validateUserAccess(recipient) {
        (
            CalcAndValidateRedeemResult memory calcResult,
            bool spendLiquidity
        ) = _redeemInstant(
                tokenOut,
                amountMTokenIn,
                minReceiveAmount,
                recipient
            );

        _postRedeemInstant(tokenOut, calcResult);

        if (spendLiquidity) {
            _sendTokensFromLiquidity(tokenOut, recipient, calcResult);
        }

        emit RedeemInstantV2(
            msg.sender,
            tokenOut,
            recipient,
            amountMTokenIn,
            calcResult.feeAmount,
            calcResult.amountTokenOutWithoutFee
        );
    }

    /**
     * @dev internal redeem request logic with custom recipient
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param recipient recipient address
     * @param isFiat is fiat requests
     * @return requestId request id
     */
    function _redeemRequestWithCustomRecipient(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipient,
        bool isFiat
    )
        private
        validateUserAccess(recipient)
        returns (
            uint256 /* requestId */
        )
    {
        (uint256 requestId, uint256 feePercent) = _redeemRequest(
            tokenOut,
            amountMTokenIn,
            isFiat,
            recipient
        );

        emit RedeemRequestV2(
            requestId,
            msg.sender,
            tokenOut,
            recipient,
            amountMTokenIn,
            feePercent
        );

        return requestId;
    }

    /**
     * @dev internal redeem instant logic
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param minReceiveAmount min amount of tokenOut to receive (decimals 18)
     *
     * @return calcResult calculated redeem result
     */
    function _redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address /* recipient */
    )
        internal
        virtual
        returns (
            CalcAndValidateRedeemResult memory calcResult,
            bool spendLiquidity
        )
    {
        spendLiquidity = true;

        address user = msg.sender;

        _validateInstantFee();

        calcResult = _calcAndValidateRedeem(
            user,
            tokenOut,
            amountMTokenIn,
            0,
            0,
            false,
            0,
            true,
            false
        );

        _requireAndUpdateLimit(amountMTokenIn);

        require(
            calcResult.amountTokenOutWithoutFee >= minReceiveAmount,
            "RV: minReceiveAmount > actual"
        );

        _requireAndUpdateAllowance(tokenOut, calcResult.amountTokenOut);

        mToken.burn(user, amountMTokenIn);
    }

    /**
     * @dev internal post redeem instant hook logic
     * can be overridden by the child contract to add custom logic
     * @param tokenOut tokenOut address
     * @param calcResult calculated redeem instant result
     */
    function _postRedeemInstant(
        address tokenOut,
        CalcAndValidateRedeemResult memory calcResult
    ) internal virtual {}

    function _sendTokensFromLiquidity(
        address tokenOut,
        address recipient,
        CalcAndValidateRedeemResult memory calcResult
    ) internal {
        uint256 tokenOutBalanceBase18 = IERC20(tokenOut)
            .balanceOf(address(this))
            .convertToBase18(calcResult.tokenOutDecimals);

        uint256 totalAmount = calcResult.amountTokenOutWithoutFee +
            calcResult.feeAmount;

        uint256 toUseVaultLiquidity = tokenOutBalanceBase18 >= totalAmount
            ? totalAmount
            : tokenOutBalanceBase18;

        uint256 toUseLpLiquidity = totalAmount - toUseVaultLiquidity;

        uint256 lpFeePortion = _truncate(
            (calcResult.feeAmount * toUseLpLiquidity) / totalAmount,
            calcResult.tokenOutDecimals
        );

        uint256 vaultFeePortion = calcResult.feeAmount - lpFeePortion;

        uint256 toTransferFromLp = toUseLpLiquidity - lpFeePortion;

        // transfer from lp liquidity to vault liquidity
        if (toTransferFromLp > 0) {
            _useLoanLpLiquidity(
                tokenOut,
                toTransferFromLp,
                calcResult.tokenOutRate
            );
        }

        // transfer from vault liquidity to user
        _tokenTransferToUser(
            tokenOut,
            recipient,
            calcResult.amountTokenOutWithoutFee,
            calcResult.tokenOutDecimals
        );

        // transfer vault fee portion to fee receiver
        _tokenTransferToUser(
            tokenOut,
            feeReceiver,
            vaultFeePortion,
            calcResult.tokenOutDecimals
        );

        if (toTransferFromLp > 0) {
            // we dont transfer lp fee portion just yet,
            // it will be transferred during the loan repayment

            uint256 loanRequestId = currentLoanRequestId.current();

            loanRequests[loanRequestId] = LiquidityProviderLoanRequest({
                tokenOut: tokenOut,
                amountTokenOut: toTransferFromLp,
                amountFee: lpFeePortion,
                status: RequestStatus.Pending
            });
            currentLoanRequestId.increment();

            emit CreateLiquidityProviderLoanRequest(
                loanRequestId,
                tokenOut,
                toTransferFromLp,
                lpFeePortion,
                calcResult.mTokenRate,
                calcResult.tokenOutRate
            );
        }
    }

    function _useLoanLpLiquidity(
        address tokenOut,
        uint256 amountTokenOutBase18,
        uint256 tokenOutRate
    ) internal {
        address _loanLp = loanLp;
        IRedemptionVault _loanSwapperVault = loanSwapperVault;

        require(
            _loanLp != address(0) && address(_loanSwapperVault) != address(0),
            "RV: loan lp not configured"
        );

        uint256 mTokenARate = _loanSwapperVault
            .mTokenDataFeed()
            .getDataInBase18();

        // Ceil so the inner vault's floored output is still >= amountTokenOutBase18.
        // Requires address(this) to have waivedFeeRestriction on the inner vault
        uint256 mTokenAAmount = Math.mulDiv(
            amountTokenOutBase18,
            tokenOutRate,
            mTokenARate,
            Math.Rounding.Up
        );

        IERC20 mTokenA = IERC20(address(_loanSwapperVault.mToken()));

        mTokenA.transferFrom(_loanLp, address(this), mTokenAAmount);

        mTokenA.safeIncreaseAllowance(
            address(_loanSwapperVault),
            mTokenAAmount
        );

        _loanSwapperVault.redeemInstant(
            tokenOut,
            mTokenAAmount,
            amountTokenOutBase18
        );
    }

    /**
     * @notice internal redeem request logic
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     *
     * @return requestId request id
     * @return feePercent fee percent
     */
    function _redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        bool isFiat,
        address recipient
    ) internal returns (uint256 requestId, uint256 feePercent) {
        if (!isFiat) {
            require(
                tokenOut != MANUAL_FULLFILMENT_TOKEN,
                "RV: tokenOut == fiat"
            );
            _requireTokenExists(tokenOut);
        }

        address user = msg.sender;

        _validateMTokenAmount(user, amountMTokenIn, isFiat);

        _validateInstantFee();

        feePercent = _getFee(
            user,
            tokenOut,
            false,
            isFiat ? fiatAdditionalFee : 0
        );

        (, uint256 mTokenRate, uint256 tokenOutRate) = _convertMTokenToTokenOut(
            amountMTokenIn,
            0,
            tokenOut,
            0
        );

        _tokenTransferFromUser(
            address(mToken),
            address(requestRedeemer),
            amountMTokenIn,
            18 // mToken always have 18 decimals
        );

        requestId = currentRequestId.current();
        currentRequestId.increment();

        redeemRequests[requestId] = RequestV2({
            sender: recipient,
            tokenOut: tokenOut,
            status: RequestStatus.Pending,
            amountMToken: amountMTokenIn,
            mTokenRate: mTokenRate,
            tokenOutRate: tokenOutRate,
            feePercent: feePercent,
            version: 1
        });
    }

    /**
     * @dev calculates tokenOut amount from USD amount
     * @param amountUsd amount of USD (decimals 18)
     * @param tokenOut tokenOut address
     * @param overrideTokenRate override token rate if not zero

     * @return amountToken converted USD to tokenOut
     * @return tokenRate conversion rate
     */
    function _convertUsdToToken(
        uint256 amountUsd,
        address tokenOut,
        uint256 overrideTokenRate
    ) internal view returns (uint256 amountToken, uint256 tokenRate) {
        require(amountUsd > 0, "RV: amount zero");

        if (overrideTokenRate > 0) {
            tokenRate = overrideTokenRate;
        } else {
            if (tokenOut == MANUAL_FULLFILMENT_TOKEN) {
                return (amountUsd, STABLECOIN_RATE);
            }
            tokenRate = _getPTokenRate(tokenOut);
        }

        amountToken = (amountUsd * (10**18)) / tokenRate;
    }

    /**
     * @dev calculates USD amount from mToken amount
     * @param amountMToken amount of mToken (decimals 18)
     * @param overrideTokenRate override mToken rate if not zero
     *
     * @return amountUsd converted amount to USD
     * @return mTokenRate conversion rate
     */
    function _convertMTokenToUsd(
        uint256 amountMToken,
        uint256 overrideTokenRate
    ) internal view returns (uint256 amountUsd, uint256 mTokenRate) {
        require(amountMToken > 0, "RV: amount zero");

        mTokenRate = overrideTokenRate > 0
            ? overrideTokenRate
            : _getMTokenRate();

        amountUsd = (amountMToken * mTokenRate) / (10**18);
    }

    /**
     * @dev validate redeem and calculate fee
     * @param user user address
     * @param tokenOut tokenOut address
     * @param amountMTokenIn mToken amount (decimals 18)
     * @param overrideMTokenRate override mToken rate if not zero
     * @param overrideTokenOutRate override token rate if not zero
     * @param shouldOverrideFeePercent should override fee percent if true
     * @param overrideFeePercent override fee percent if shouldOverrideFeePercent is true
     * @param isInstant is instant operation
     * @param isFiat is fiat operation
     *
     * @return result calc result
     */
    function _calcAndValidateRedeem(
        address user,
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 overrideMTokenRate,
        uint256 overrideTokenOutRate,
        bool shouldOverrideFeePercent,
        uint256 overrideFeePercent,
        bool isInstant,
        bool isFiat
    )
        internal
        view
        virtual
        returns (CalcAndValidateRedeemResult memory result)
    {
        if (!isFiat) {
            _requireTokenExists(tokenOut);
        }

        _validateMTokenAmount(user, amountMTokenIn, isFiat);

        (
            uint256 amountTokenOut,
            uint256 mTokenRate,
            uint256 tokenOutRate
        ) = _convertMTokenToTokenOut(
                amountMTokenIn,
                overrideMTokenRate,
                tokenOut,
                overrideTokenOutRate
            );

        result.tokenOutDecimals = _tokenDecimals(tokenOut);
        result.tokenOutRate = tokenOutRate;
        result.mTokenRate = mTokenRate;

        result.feeAmount = _getFeeAmount(
            shouldOverrideFeePercent
                ? overrideFeePercent
                : _getFee(
                    user,
                    tokenOut,
                    isInstant,
                    isFiat ? fiatAdditionalFee : 0
                ),
            amountTokenOut
        );

        if (isFiat) {
            require(
                tokenOut == MANUAL_FULLFILMENT_TOKEN,
                "RV: tokenOut != fiat"
            );
            if (!waivedFeeRestriction[user])
                // as fee is in tokenOut and fiatFlatFee is in mToken,
                // we need to convert it to be in tokenOut
                result.feeAmount += (fiatFlatFee * mTokenRate) / tokenOutRate;
        }
        amountTokenOut = _truncate(amountTokenOut, result.tokenOutDecimals);
        result.feeAmount = _truncate(result.feeAmount, result.tokenOutDecimals);

        require(amountTokenOut > result.feeAmount, "RV: amountTokenOut < fee");

        result.amountTokenOut = amountTokenOut;

        result.amountTokenOutWithoutFee = amountTokenOut - result.feeAmount;
    }

    /**
     * @dev converts mToken to tokenOut amount
     * @param amountMTokenIn amount of mToken
     * @param overrideMTokenRate override mToken rate if not zero
     * @param tokenOut tokenOut address
     * @param overrideTokenOutRate override token rate if not zero
     *
     * @return amountTokenOut amount of tokenOut
     * @return mTokenRate conversion rate
     * @return tokenOutRate conversion rate
     */
    function _convertMTokenToTokenOut(
        uint256 amountMTokenIn,
        uint256 overrideMTokenRate,
        address tokenOut,
        uint256 overrideTokenOutRate
    )
        internal
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        (uint256 amountMTokenInUsd, uint256 mTokenRate) = _convertMTokenToUsd(
            amountMTokenIn,
            overrideMTokenRate
        );
        (uint256 amountTokenOut, uint256 tokenOutRate) = _convertUsdToToken(
            amountMTokenInUsd,
            tokenOut,
            overrideTokenOutRate
        );
        return (amountTokenOut, mTokenRate, tokenOutRate);
    }

    /**
     * @dev validates mToken amount for different constraints
     * @param user user address
     * @param amountMTokenIn amount of mToken
     * @param isFiat is fiat operation
     */
    function _validateMTokenAmount(
        address user,
        uint256 amountMTokenIn,
        bool isFiat
    ) internal view {
        require(amountMTokenIn > 0, "RV: invalid amount");

        if (!isFreeFromMinAmount[user]) {
            uint256 minRedeemAmount = isFiat ? minFiatRedeemAmount : minAmount;
            require(minRedeemAmount <= amountMTokenIn, "RV: amount < min");
        }
    }

    /*
     * @dev validates that liquidity of provided token on `requestRedeemer` is enough
     * @param token token address
     * @param requiredLiquidity minimum required liquidity of `requestRedeemer`
     * @param tokenDecimals `token` decimals
     *
     * @return false if not enough liquidity, otherwise true
     */
    function _validateLiquidity(
        address token,
        uint256 requiredLiquidity,
        uint256 tokenDecimals
    )
        internal
        view
        returns (
            bool /* success */
        )
    {
        uint256 balance = IERC20(token).balanceOf(requestRedeemer);
        return balance >= requiredLiquidity.convertFromBase18(tokenDecimals);
    }
}
