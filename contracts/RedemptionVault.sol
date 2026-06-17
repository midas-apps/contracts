// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {IRedemptionVault, CommonVaultInitParams, LiquidityProviderLoanRequest, Request, RequestStatus, RedemptionVaultInitParams} from "./interfaces/IRedemptionVault.sol";
import {ManageableVault} from "./abstract/ManageableVault.sol";
import {RedemptionVaultUtils} from "./libraries/RedemptionVaultUtils.sol";

/**
 * @title RedemptionVault
 * @notice Smart contract that handles mToken redemptions
 * @author RedDuck Software
 */
contract RedemptionVault is ManageableVault, IRedemptionVault {
    using DecimalsCorrectionLibrary for uint256;
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
     * @notice mapping, requestId to request data
     */
    mapping(uint256 => Request) public redeemRequests;

    /**
     * @notice mapping, loanRequestId to loan request data
     */
    mapping(uint256 => LiquidityProviderLoanRequest) public loanRequests;

    /**
     * @notice address is designated for standard redemptions, allowing tokens to be pulled from this address
     */
    address public requestRedeemer;

    /**
     * @notice address of loan liquidity provider
     */
    address public loanLp;

    /**
     * @notice address from which payment tokens will be pulled during loan repayment
     */
    address public loanRepaymentAddress;

    /**
     * @notice loan APR value in basis points (100 = 1%)
     */
    uint256 public loanApr;

    /**
     * @notice flag to determine if the loan LP liquidity should be used first
     */
    bool public preferLoanLiquidity;

    /**
     * @notice last loan request id
     */
    uint256 public currentLoanRequestId;

    /**
     * @notice address of loan RedemptionVault-compatible vault
     */
    IRedemptionVault public loanSwapperVault;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice Passes role identifiers to the base ManageableVault constructor
     * @param _contractAdminRole contract admin role identifier
     * @param _greenlistedRole greenlisted role identifier
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole)
        ManageableVault(_contractAdminRole, _greenlistedRole)
    {}

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _redemptionVaultInitParams init params for redemption vault
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        RedemptionVaultInitParams calldata _redemptionVaultInitParams
    ) public initializer {
        __ManageableVault_init(_commonVaultInitParams);

        _validateAddress(_redemptionVaultInitParams.requestRedeemer, false);

        requestRedeemer = _redemptionVaultInitParams.requestRedeemer;

        loanLp = _redemptionVaultInitParams.loanLp;
        loanRepaymentAddress = _redemptionVaultInitParams.loanRepaymentAddress;
        loanSwapperVault = IRedemptionVault(
            _redemptionVaultInitParams.loanSwapperVault
        );
        loanApr = _redemptionVaultInitParams.loanApr;
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemInstant(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount
    ) external returns (uint256) {
        return
            _redeemInstantWithCustomRecipient(
                tokenOut,
                amountMTokenIn,
                minReceiveAmount,
                msg.sender,
                ONE_HUNDRED_PERCENT
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
    ) external returns (uint256) {
        return
            _redeemInstantWithCustomRecipient(
                tokenOut,
                amountMTokenIn,
                minReceiveAmount,
                recipient,
                ONE_HUNDRED_PERCENT
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(address tokenOut, uint256 amountMTokenIn)
        external
        returns (uint256 requestId)
    {
        (requestId, ) = _redeemRequestWithCustomRecipient(
            tokenOut,
            amountMTokenIn,
            msg.sender,
            0,
            0,
            msg.sender
        );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipientRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
    )
        external
        returns (
            uint256, /*requestId*/
            uint256 /* instantReceivedAmount */
        )
    {
        return
            _redeemRequestWithCustomRecipient(
                tokenOut,
                amountMTokenIn,
                recipientRequest,
                instantShare,
                minReceiveAmountInstantShare,
                recipientInstant
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        _safeBulkApproveRequest(requestIds, 0, true, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(uint256[] calldata requestIds) external {
        _safeBulkApproveRequest(requestIds, _getMTokenRate(), false, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAvgRate(uint256[] calldata requestIds)
        external
    {
        _safeBulkApproveRequest(requestIds, _getMTokenRate(), false, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) external {
        _safeBulkApproveRequest(requestIds, newOutRate, false, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAvgRate(
        uint256[] calldata requestIds,
        uint256 avgMTokenRate
    ) external {
        _safeBulkApproveRequest(requestIds, avgMTokenRate, false, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequest(
        uint256 requestId,
        uint256 newMTokenRate,
        bool isAvgRate
    ) external onlyContractAdmin {
        _approveRequest(requestId, newMTokenRate, false, isAvgRate);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function rejectRequest(uint256 requestId) external onlyContractAdmin {
        Request memory request = redeemRequests[requestId];

        _validateRequest(requestId, request.recipient, request.status);
        _validateAndUpdateNextRequestIdToProcess(requestId, true);

        redeemRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function bulkRepayLpLoanRequest(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        uint256 _loanApr = loanApr;
        for (uint256 i = 0; i < requestIds.length; ++i) {
            LiquidityProviderLoanRequest memory request = loanRequests[
                requestIds[i]
            ];

            _validateRequest(requestIds[i], request.tokenOut, request.status);

            uint256 duration = block.timestamp - request.createdAt;
            uint256 accruedInterest = (request.amountTokenOut *
                _loanApr *
                duration) / (10_000 * 365 days);

            uint256 amountFee;

            if (accruedInterest > request.amountFee) {
                amountFee = accruedInterest;
                loanRequests[requestIds[i]].amountFee = amountFee;
            } else {
                amountFee = request.amountFee;
            }

            _tokenTransferFromTo(
                request.tokenOut,
                loanRepaymentAddress,
                loanLp,
                request.amountTokenOut + amountFee,
                _tokenDecimals(request.tokenOut)
            );

            loanRequests[requestIds[i]].status = RequestStatus.Processed;
            emit RepayLpLoanRequest(requestIds[i], amountFee);
        }
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function cancelLpLoanRequest(uint256 requestId) external onlyContractAdmin {
        LiquidityProviderLoanRequest memory request = loanRequests[requestId];

        _validateRequest(requestId, request.tokenOut, request.status);

        loanRequests[requestId].status = RequestStatus.Canceled;
        emit CancelLpLoanRequest(requestId);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setRequestRedeemer(address redeemer) external onlyContractAdmin {
        _validateAddress(redeemer, false);

        requestRedeemer = redeemer;

        emit SetRequestRedeemer(redeemer);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanLp(address newLoanLp) external onlyContractAdmin {
        loanLp = newLoanLp;

        emit SetLoanLp(newLoanLp);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanRepaymentAddress(address newLoanRepaymentAddress)
        external
        onlyContractAdmin
    {
        loanRepaymentAddress = newLoanRepaymentAddress;

        emit SetLoanRepaymentAddress(newLoanRepaymentAddress);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanSwapperVault(address newLoanSwapperVault)
        external
        onlyContractAdmin
    {
        loanSwapperVault = IRedemptionVault(newLoanSwapperVault);

        emit SetLoanSwapperVault(newLoanSwapperVault);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanApr(uint256 newLoanApr) external onlyContractAdmin {
        loanApr = newLoanApr;

        emit SetLoanApr(newLoanApr);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setPreferLoanLiquidity(bool newLoanLpFirst)
        external
        onlyContractAdmin
    {
        preferLoanLiquidity = newLoanLpFirst;

        emit SetPreferLoanLiquidity(newLoanLpFirst);
    }

    /**
     * @dev internal function to approve requests
     * @param requestIds request ids
     * @param newOutRate new out rate
     * @param isRequestRate if true, newOutRate will be ignored and request rate will be used
     * @param isAvgRate if true, newOutRate is avg rate
     */
    function _safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate,
        bool isRequestRate,
        bool isAvgRate
    ) private onlyContractAdmin {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            if (isRequestRate) {
                newOutRate = redeemRequests[requestIds[i]].mTokenRate;
            }

            bool success = _approveRequest(
                requestIds[i],
                newOutRate,
                true,
                isAvgRate
            );

            if (!success) {
                continue;
            }
        }
    }

    /**
     * @dev validates approve
     * burns amount from contract
     * transfer tokenOut to user
     * sets flag Processed
     * @param requestId request id
     * @param newMTokenRate new mToken rate
     * @param isSafe if true:
     * - safely validates max approve request id
     * - safely validates if request id is sequential
     * - safely validates if there is enough liquidity
     * - requires variation tolerance
     * @param isAvgRate if true, calculates holdback part rate from avg rate
     *
     * @return success true if success, otherwise false if isSafe flag is true,
     * or revert if isSafe flag is false
     */
    function _approveRequest(
        uint256 requestId,
        uint256 newMTokenRate,
        bool isSafe,
        bool isAvgRate
    )
        private
        returns (
            bool /* success */
        )
    {
        Request memory request = redeemRequests[requestId];

        _validateRequest(requestId, request.recipient, request.status);

        _validateUserAccess(request.recipient, false);

        if (isSafe) {
            _requireVariationTolerance(request.mTokenRate, newMTokenRate);
        }

        if (isAvgRate) {
            uint256 avgRate = _calculateHoldbackPartRateFromAvg(
                request,
                newMTokenRate
            );

            if (avgRate != 0) {
                newMTokenRate = avgRate;
            }
        }

        require(newMTokenRate > 0, InvalidNewMTokenRate());

        CalcAndValidateRedeemResult memory calcResult = _calcAndValidateRedeem(
            request.recipient,
            request.tokenOut,
            request.amountMToken,
            newMTokenRate,
            request.tokenOutRate,
            true,
            request.feePercent,
            false
        );

        if (
            (isSafe &&
                IERC20(request.tokenOut).balanceOf(requestRedeemer) <
                (calcResult.amountTokenOutWithoutFee + calcResult.feeAmount)
                    .convertFromBase18(calcResult.tokenOutDecimals)) ||
            !_validateAndUpdateNextRequestIdToProcess(requestId, !isSafe)
        ) {
            return false;
        }

        _tokenTransferFromTo(
            request.tokenOut,
            requestRedeemer,
            request.recipient,
            calcResult.amountTokenOutWithoutFee,
            calcResult.tokenOutDecimals
        );

        _requireAndUpdateAllowance(request.tokenOut, calcResult.amountTokenOut);

        mToken.burn(requestRedeemer, request.amountMToken);

        request.amountTokenOut = calcResult.amountTokenOutWithoutFee;
        request.approvedMTokenRate = newMTokenRate;
        request.status = RequestStatus.Processed;

        redeemRequests[requestId] = request;

        emit ApproveRequest(requestId, newMTokenRate, isSafe, isAvgRate);

        return true;
    }

    /**
     * @notice validates request
     * if exist
     * if status is expected
     * @param requestId request id
     * @param validateAddress address to check if not zero
     * @param status actual request status
     */
    function _validateRequest(
        uint256 requestId,
        address validateAddress,
        RequestStatus status
    ) private pure {
        require(validateAddress != address(0), RequestNotExists(requestId));
        require(
            status == RequestStatus.Pending,
            UnexpectedRequestStatus(requestId, status)
        );
    }

    /**
     * @dev internal redeem instant logic with custom recipient
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param minReceiveAmount min amount of tokenOut to receive (decimals 18)
     * @param recipient recipient address
     * @param instantShareToValidate % amount of instant share to validate
     */
    function _redeemInstantWithCustomRecipient(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient,
        uint256 instantShareToValidate
    ) private validateUserAccess(recipient) returns (uint256) {
        require(
            instantShareToValidate <= maxInstantShare,
            InstantShareTooHigh(instantShareToValidate, maxInstantShare)
        );

        CalcAndValidateRedeemResult memory calcResult = _redeemInstant(
            tokenOut,
            amountMTokenIn,
            minReceiveAmount,
            recipient
        );

        // emitting earlier for easier loan matching on the indexer
        emit RedeemInstant(
            msg.sender,
            tokenOut,
            recipient,
            amountMTokenIn,
            calcResult.feeAmount,
            calcResult.amountTokenOutWithoutFee,
            calcResult.mTokenRate,
            calcResult.tokenOutRate
        );

        _obtainLiquidityAndTransfer(tokenOut, recipient, calcResult);

        return
            calcResult.amountTokenOutWithoutFee.convertFromBase18(
                calcResult.tokenOutDecimals
            );
    }

    /**
     * @dev internal redeem request logic with custom recipient
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param recipientRequest recipient address for the request part
     * @param instantShare % amount of `amountMTokenIn` that will be redeemed instantly
     * @param minReceiveAmountInstantShare min amount of tokenOut to receive for the instant share
     * @param recipientInstant recipient address for the instant part
     * @return requestId request id
     */
    function _redeemRequestWithCustomRecipient(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipientRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
    )
        private
        validateUserAccess(recipientRequest)
        returns (
            uint256, /* requestId */
            uint256 instantReceivedAmount
        )
    {
        uint256 amountMTokenInInstant = (amountMTokenIn * instantShare) /
            ONE_HUNDRED_PERCENT;

        if (amountMTokenInInstant > 0) {
            instantReceivedAmount = _redeemInstantWithCustomRecipient(
                tokenOut,
                amountMTokenInInstant,
                minReceiveAmountInstantShare,
                recipientInstant,
                instantShare
            );
        }

        uint256 amountMTokenInRequest = amountMTokenIn - amountMTokenInInstant;

        return (
            _redeemRequest(
                tokenOut,
                amountMTokenInRequest,
                recipientRequest,
                amountMTokenInInstant
            ),
            instantReceivedAmount
        );
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
    ) private returns (CalcAndValidateRedeemResult memory calcResult) {
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
            true
        );

        _requireAndUpdateLimit(amountMTokenIn);

        _requireSlippageNotExceeded(
            calcResult.amountTokenOutWithoutFee,
            minReceiveAmount
        );

        _requireAndUpdateAllowance(tokenOut, calcResult.amountTokenOut);

        mToken.burn(user, amountMTokenIn);
    }

    /**
     * @dev Calculates how much of liquidity is needed to fulfill the redemption
     * and gets missing amount from all the available sources - vault liquidity and loan LP liquidity
     * if `preferLoanLiquidity` is true, it will first try to use loan LP liquidity,
     */
    function _obtainLiquidity(
        address tokenOut,
        CalcAndValidateRedeemResult memory calcResult
    ) private returns (uint256 usedLpLiquidity, uint256 lpFeePortion) {
        uint256 tokenOutBalanceBase18 = IERC20(tokenOut)
            .balanceOf(address(this))
            .convertToBase18(_tokenDecimals(tokenOut));

        uint256 totalAmount = calcResult.amountTokenOutWithoutFee +
            calcResult.feeAmount;

        if (preferLoanLiquidity) {
            (usedLpLiquidity, lpFeePortion) = _tryObtainLoanLpLiquidity(
                tokenOut,
                totalAmount,
                totalAmount,
                calcResult.tokenOutRate,
                calcResult.feeAmount,
                calcResult.tokenOutDecimals
            );

            uint256 newBalance = tokenOutBalanceBase18 + usedLpLiquidity;

            if (newBalance < totalAmount) {
                _tryObtainVaultLiquidity(
                    tokenOut,
                    totalAmount - newBalance,
                    calcResult.tokenOutRate,
                    newBalance,
                    calcResult.tokenOutDecimals
                );
            }
        } else if (tokenOutBalanceBase18 < totalAmount) {
            uint256 obtainedVaultLiquidity = _tryObtainVaultLiquidity(
                tokenOut,
                totalAmount - tokenOutBalanceBase18,
                calcResult.tokenOutRate,
                tokenOutBalanceBase18,
                calcResult.tokenOutDecimals
            );

            uint256 newBalance = tokenOutBalanceBase18 + obtainedVaultLiquidity;

            if (newBalance < totalAmount) {
                (usedLpLiquidity, lpFeePortion) = _tryObtainLoanLpLiquidity(
                    tokenOut,
                    totalAmount - newBalance,
                    totalAmount,
                    calcResult.tokenOutRate,
                    calcResult.feeAmount,
                    calcResult.tokenOutDecimals
                );
            }
        }
    }

    /**
     * @dev Obtains liquidity from different sources and transfers it to the recipient
     * as well as fee distribution
     * @param tokenOut tokenOut address
     * @param recipient recipient address
     * @param calcResult calculated redeem result
     */
    function _obtainLiquidityAndTransfer(
        address tokenOut,
        address recipient,
        CalcAndValidateRedeemResult memory calcResult
    ) private {
        uint256 usedLpLiquidity;
        uint256 lpFeePortion;

        (usedLpLiquidity, lpFeePortion) = _obtainLiquidity(
            tokenOut,
            calcResult
        );

        // transfer from vault liquidity to user
        _tokenTransferFromTo(
            tokenOut,
            address(this),
            recipient,
            calcResult.amountTokenOutWithoutFee,
            calcResult.tokenOutDecimals
        );

        if (usedLpLiquidity == 0) {
            return;
        }

        uint256 loanRequestId = currentLoanRequestId++;

        loanRequests[loanRequestId] = LiquidityProviderLoanRequest({
            tokenOut: tokenOut,
            amountTokenOut: usedLpLiquidity,
            amountFee: lpFeePortion,
            createdAt: block.timestamp,
            status: RequestStatus.Pending
        });

        emit CreateLiquidityProviderLoanRequest(
            loanRequestId,
            tokenOut,
            usedLpLiquidity,
            lpFeePortion,
            calcResult.mTokenRate,
            calcResult.tokenOutRate
        );
    }

    /**
     * @dev wraps _obtainVaultLiquidityExternal with try/catch
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     * @param currentTokenOutBalanceBase18 current balance of tokenOut in the vault in base 18
     * @param tokenOutDecimals decimals of tokenOut
     */
    function _tryObtainVaultLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 tokenOutRate,
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    ) private returns (uint256 obtainedLiquidityBase18) {
        try
            this._obtainVaultLiquidityExternal(
                tokenOut,
                missingAmountBase18,
                tokenOutRate,
                currentTokenOutBalanceBase18,
                tokenOutDecimals
            )
        returns (uint256 _obtainedLiquidityBase18) {
            obtainedLiquidityBase18 = _obtainedLiquidityBase18;
        } catch {
            // do nothing
        }
    }

    /**
     * @dev wraps _obtainLoanLpLiquidityExternal with try/catch
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param totalAmount total amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     * @param totalFee total fee of tokenOut
     * @param tokenOutDecimals decimals of tokenOut
     */
    function _tryObtainLoanLpLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 totalAmount,
        uint256 tokenOutRate,
        uint256 totalFee,
        uint256 tokenOutDecimals
    ) private returns (uint256 obtainedLiquidityBase18, uint256 lpFeePortion) {
        try
            this._obtainLoanLpLiquidityExternal(
                tokenOut,
                missingAmountBase18,
                totalAmount,
                tokenOutRate,
                totalFee,
                tokenOutDecimals
            )
        returns (uint256 _obtainedLiquidityBase18, uint256 _lpFeePortion) {
            (obtainedLiquidityBase18, lpFeePortion) = (
                _obtainedLiquidityBase18,
                _lpFeePortion
            );
        } catch {
            // do nothing
        }
    }

    /**
     * @dev Check if contract has enough tokenOut balance for redeem,
     * if not, obtains liquidity trough the custom strategies.
     * In default implementation it does nothing.
     * @return obtainedLiquidityBase18 amount of tokenOut obtained
     */
    function _obtainVaultLiquidity(
        address, /* tokenOut */
        uint256, /* missingAmountBase18 */
        uint256, /* tokenOutRate */
        uint256, /* currentTokenOutBalanceBase18 */
        uint256 /* tokenOutDecimals */
    )
        internal
        virtual
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        return 0;
    }

    /**
     * @notice This function can only be called by the contract itself (self-call restriction)
     * @dev only calls _obtainVaultLiquidity internally and external because its used with try/catch
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     * @param currentTokenOutBalanceBase18 current balance of tokenOut in the vault in base 18
     * @param tokenOutDecimals decimals of tokenOut
     * @return obtainedLiquidityBase18 amount of tokenOut obtained
     */
    // solhint-disable-next-line private-vars-leading-underscore
    function _obtainVaultLiquidityExternal(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 tokenOutRate,
        uint256 currentTokenOutBalanceBase18,
        uint256 tokenOutDecimals
    )
        external
        returns (
            uint256 /* obtainedLiquidityBase18 */
        )
    {
        _requireSelfCall();
        return
            _obtainVaultLiquidity(
                tokenOut,
                missingAmountBase18,
                tokenOutRate,
                currentTokenOutBalanceBase18,
                tokenOutDecimals
            );
    }

    /**
     * @notice This function can only be called by the contract itself (self-call restriction)
     * @dev Check if contract has enough tokenOut balance for redeem;
     * if not, redeem the missing amount via loan LP liquidity
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param totalAmount total amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     * @param totalFee total fee of tokenOut
     * @param tokenOutDecimals decimals of tokenOut
     */
    // solhint-disable-next-line private-vars-leading-underscore
    function _obtainLoanLpLiquidityExternal(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 totalAmount,
        uint256 tokenOutRate,
        uint256 totalFee,
        uint256 tokenOutDecimals
    )
        external
        returns (
            uint256, /* amountReceivedBase18 */
            uint256 /* feePortionBase18 */
        )
    {
        _requireSelfCall();

        address _loanLp = loanLp;
        IRedemptionVault _loanSwapperVault = loanSwapperVault;

        if (missingAmountBase18 == 0) {
            return (0, 0);
        }

        // loan lp is not configured
        if (_loanLp == address(0) || address(_loanSwapperVault) == address(0)) {
            return (0, 0);
        }

        uint256 mTokenARate;
        IERC20 mTokenA;
        uint256 grossTokenOutAmount;

        // prevent stack too deep errors
        {
            uint256 mTokenABalance;

            (mTokenARate, mTokenA, mTokenABalance) = RedemptionVaultUtils
                .getSwapperDetails(_loanSwapperVault, _loanLp);

            grossTokenOutAmount = Math.mulDiv(
                mTokenABalance,
                mTokenARate,
                tokenOutRate,
                Math.Rounding.Up
            );
        }

        if (grossTokenOutAmount > missingAmountBase18) {
            grossTokenOutAmount = missingAmountBase18;
        }

        if (grossTokenOutAmount == 0) {
            return (0, 0);
        }

        uint256 lpFeePortion = _truncate(
            (totalFee * grossTokenOutAmount) / totalAmount,
            tokenOutDecimals
        );

        if (grossTokenOutAmount == lpFeePortion) {
            return (0, lpFeePortion);
        }

        address _tokenOut = tokenOut;
        uint256 _tokenOutDecimals = tokenOutDecimals;

        // Ceil so the inner vault's floored output is still >= net token out amount.
        // Requires address(this) to have waivedFeeRestriction on the inner vault.
        uint256 mTokenAAmount = Math.mulDiv(
            grossTokenOutAmount - lpFeePortion,
            tokenOutRate,
            mTokenARate,
            Math.Rounding.Up
        );

        return (
            RedemptionVaultUtils.redeemInstantSwapper(
                _loanSwapperVault,
                mTokenA,
                _loanLp,
                _tokenOut,
                mTokenAAmount,
                _tokenOutDecimals
            ),
            lpFeePortion
        );
    }

    /**
     * @notice internal redeem request logic
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param recipient recipient address
     * @param amountMTokenInstant amount of mToken that was redeemed instantly
     *
     * @return requestId request id
     */
    function _redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipient,
        uint256 amountMTokenInstant
    ) private returns (uint256 requestId) {
        _requireTokenExists(tokenOut);

        address user = msg.sender;

        _validateMTokenAmount(user, amountMTokenIn);

        _validateInstantFee();

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

        requestId = currentRequestId++;

        uint256 feePercent = _getFee(user, tokenOut, false);

        redeemRequests[requestId] = Request({
            recipient: recipient,
            tokenOut: tokenOut,
            status: RequestStatus.Pending,
            amountMToken: amountMTokenIn,
            mTokenRate: mTokenRate,
            tokenOutRate: tokenOutRate,
            feePercent: feePercent,
            amountMTokenInstant: amountMTokenInstant,
            approvedMTokenRate: 0,
            amountTokenOut: 0
        });

        emit RedeemRequest(
            requestId,
            msg.sender,
            tokenOut,
            recipient,
            amountMTokenIn,
            amountMTokenInstant,
            feePercent,
            mTokenRate,
            tokenOutRate
        );
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
        tokenRate = overrideTokenRate > 0
            ? overrideTokenRate
            : _getPTokenRate(tokenOut);

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
        bool isInstant
    )
        internal
        view
        virtual
        returns (CalcAndValidateRedeemResult memory result)
    {
        _requireTokenExists(tokenOut);

        _validateMTokenAmount(user, amountMTokenIn);

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
                : _getFee(user, tokenOut, isInstant),
            amountTokenOut
        );

        amountTokenOut = _truncate(amountTokenOut, result.tokenOutDecimals);
        result.feeAmount = _truncate(result.feeAmount, result.tokenOutDecimals);

        require(
            amountTokenOut > result.feeAmount,
            FeeExceedsAmount(result.feeAmount, amountTokenOut)
        );

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
        private
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
     * @dev reverts if the caller is not the contract itself
     */
    function _requireSelfCall() private view {
        require(msg.sender == address(this), NotSelfCall());
    }

    /**
     * @dev calculates holdback part rate from avg rate
     * @param request request
     * @param avgMTokenRate avg mToken rate
     * @return holdback part rate
     */
    function _calculateHoldbackPartRateFromAvg(
        Request memory request,
        uint256 avgMTokenRate
    ) internal pure returns (uint256) {
        if (request.amountMTokenInstant == 0) {
            return 0;
        }

        uint256 targetTotalValue = ((request.amountMToken +
            request.amountMTokenInstant) * avgMTokenRate) / (10**18);
        uint256 instantPartValue = ((request.amountMTokenInstant *
            request.mTokenRate) / (10**18));

        if (targetTotalValue <= instantPartValue) {
            return 0;
        }

        uint256 holdbackPartValue = targetTotalValue - instantPartValue;

        return (holdbackPartValue * (10**18)) / request.amountMToken;
    }
}
