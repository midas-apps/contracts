// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {IRedemptionVault, CommonVaultInitParams, LiquidityProviderLoanRequest, Request, RequestStatus, RedemptionVaultInitParams} from "./interfaces/IRedemptionVault.sol";
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
     * @notice mapping, requestId to request data
     */
    mapping(uint256 => Request) public redeemRequests;

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
     * @notice maximum loan APR value in basis points (100 = 1%)
     */
    uint64 public maxLoanApr;

    /**
     * @notice loan APR value in basis points (100 = 1%)
     */
    uint64 public loanApr;

    /**
     * @notice flag to determine if the loan LP liquidity should be used first
     */
    bool public preferLoanLiquidity;

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
    uint256[50] private __gap;

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
        loanLpFeeReceiver = _redemptionVaultInitParams.loanLpFeeReceiver;
        loanRepaymentAddress = _redemptionVaultInitParams.loanRepaymentAddress;
        loanSwapperVault = IRedemptionVault(
            _redemptionVaultInitParams.loanSwapperVault
        );
        maxLoanApr = _redemptionVaultInitParams.maxLoanApr;
        loanApr = _redemptionVaultInitParams.loanApr;
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
    ) external {
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
        returns (
            uint256 /*requestId*/
        )
    {
        return
            _redeemRequestWithCustomRecipient(
                tokenOut,
                amountMTokenIn,
                msg.sender,
                address(0),
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
                address(0),
                0,
                0,
                recipient
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipientRequest,
        address claimerRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
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
                recipientRequest,
                claimerRequest,
                instantShare,
                minReceiveAmountInstantShare,
                recipientInstant
            );
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function claimRequest(uint256 requestId)
        external
        validateUserAccess(msg.sender)
    {
        Request memory request = redeemRequests[requestId];
        _validateRequest(
            requestId,
            request.recipient,
            request.status,
            RequestStatus.Approved
        );
        require(
            msg.sender == request.claimer || msg.sender == request.recipient,
            InvalidClaimer(requestId, msg.sender)
        );

        redeemRequests[requestId].status = RequestStatus.Processed;

        _tokenTransferFromTo(
            request.tokenOut,
            requestRedeemer,
            msg.sender,
            request.amountTokenOut,
            _tokenDecimals(request.tokenOut)
        );

        emit ClaimRequest(msg.sender, requestId);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            uint256 rate = redeemRequests[requestIds[i]].mTokenRate;
            bool success = _approveRequest(
                requestIds[i],
                rate,
                true,
                true,
                false
            );

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
        _safeBulkApproveRequest(requestIds, currentMTokenRate, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAvgRate(uint256[] calldata requestIds)
        external
    {
        uint256 currentMTokenRate = _getMTokenRate();
        _safeBulkApproveRequest(requestIds, currentMTokenRate, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) external {
        _safeBulkApproveRequest(requestIds, newOutRate, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeBulkApproveRequestAvgRate(
        uint256[] calldata requestIds,
        uint256 avgMTokenRate
    ) external {
        _safeBulkApproveRequest(requestIds, avgMTokenRate, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        onlyContractAdmin
    {
        _approveRequest(requestId, newMTokenRate, false, false, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate)
        external
        onlyContractAdmin
    {
        _approveRequest(requestId, avgMTokenRate, false, false, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        onlyContractAdmin
    {
        _approveRequest(requestId, newMTokenRate, true, false, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate)
        external
        onlyContractAdmin
    {
        _approveRequest(requestId, avgMTokenRate, true, false, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function rejectRequest(uint256 requestId) external onlyContractAdmin {
        Request memory request = redeemRequests[requestId];

        _validateRequest(requestId, request.recipient, request.status);

        redeemRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.recipient);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function bulkRepayLpLoanRequest(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        uint64 _loanApr = loanApr;
        require(_loanApr <= maxLoanApr, LoanAprTooHigh(_loanApr, maxLoanApr));

        for (uint256 i = 0; i < requestIds.length; ++i) {
            LiquidityProviderLoanRequest memory request = loanRequests[
                requestIds[i]
            ];

            _validateRequest(requestIds[i], request.tokenOut, request.status);

            uint256 decimals = _tokenDecimals(request.tokenOut);
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
                request.amountTokenOut,
                decimals
            );

            if (amountFee > 0) {
                require(
                    loanLpFeeReceiver != address(0),
                    InvalidLoanLpReceiver()
                );
                _tokenTransferFromTo(
                    request.tokenOut,
                    loanRepaymentAddress,
                    loanLpFeeReceiver,
                    amountFee,
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
    function cancelLpLoanRequest(uint256 requestId) external onlyContractAdmin {
        LiquidityProviderLoanRequest memory request = loanRequests[requestId];

        _validateRequest(requestId, request.tokenOut, request.status);

        loanRequests[requestId].status = RequestStatus.Canceled;
        emit CancelLpLoanRequest(msg.sender, requestId);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setRequestRedeemer(address redeemer) external onlyContractAdmin {
        _validateAddress(redeemer, false);

        requestRedeemer = redeemer;

        emit SetRequestRedeemer(msg.sender, redeemer);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanLp(address newLoanLp) external onlyContractAdmin {
        loanLp = newLoanLp;

        emit SetLoanLp(msg.sender, newLoanLp);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanLpFeeReceiver(address newLoanLpFeeReceiver)
        external
        onlyContractAdmin
    {
        loanLpFeeReceiver = newLoanLpFeeReceiver;

        emit SetLoanLpFeeReceiver(msg.sender, newLoanLpFeeReceiver);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanRepaymentAddress(address newLoanRepaymentAddress)
        external
        onlyContractAdmin
    {
        loanRepaymentAddress = newLoanRepaymentAddress;

        emit SetLoanRepaymentAddress(msg.sender, newLoanRepaymentAddress);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanSwapperVault(address newLoanSwapperVault)
        external
        onlyContractAdmin
    {
        loanSwapperVault = IRedemptionVault(newLoanSwapperVault);

        emit SetLoanSwapperVault(msg.sender, newLoanSwapperVault);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setMaxLoanApr(uint64 newMaxLoanApr) external onlyContractAdmin {
        maxLoanApr = newMaxLoanApr;

        emit SetMaxLoanApr(msg.sender, newMaxLoanApr);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setLoanApr(uint64 newLoanApr) external onlyContractAdmin {
        loanApr = newLoanApr;
        emit SetLoanApr(msg.sender, newLoanApr);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function setPreferLoanLiquidity(bool newLoanLpFirst)
        external
        onlyContractAdmin
    {
        preferLoanLiquidity = newLoanLpFirst;

        emit SetPreferLoanLiquidity(msg.sender, newLoanLpFirst);
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
     * @param isAvgRate if true, newOutRate is avg rate
     */
    function _safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate,
        bool isAvgRate
    ) private onlyContractAdmin {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            bool success = _approveRequest(
                requestIds[i],
                newOutRate,
                true,
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
     * @param isSafe new mToken rate
     * @param safeValidateLiquidity if true, checks if there is enough liquidity
     * and if its not sufficient, function wont fail
     * @param isAvgRate if true, calculates holdback part rate from avg rate
     *
     * @return success true if success, false only in case if
     * safeValidateLiquidity == true and there is not enough liquidity
     */
    function _approveRequest(
        uint256 requestId,
        uint256 newMTokenRate,
        bool isSafe,
        bool safeValidateLiquidity,
        bool isAvgRate
    )
        private
        returns (
            bool /* success */
        )
    {
        Request memory request = redeemRequests[requestId];

        _validateRequest(requestId, request.recipient, request.status);

        if (isSafe) {
            require(
                requestId <= maxApproveRequestId,
                RequestIdTooHigh(requestId, maxApproveRequestId)
            );
            _requireVariationTolerance(request.mTokenRate, newMTokenRate);
        }

        if (isAvgRate) {
            require(request.amountMTokenInstant > 0, InvalidInstantAmount());
            newMTokenRate = _calculateHoldbackPartRateFromAvg(
                request,
                newMTokenRate
            );
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

        bool hasClaimer = request.claimer != address(0);

        if (
            safeValidateLiquidity &&
            !_validateLiquidity(
                request.tokenOut,
                hasClaimer
                    ? calcResult.feeAmount
                    : calcResult.amountTokenOutWithoutFee +
                        calcResult.feeAmount,
                calcResult.tokenOutDecimals
            )
        ) {
            return false;
        }

        if (hasClaimer) {
            request.status = RequestStatus.Approved;
        } else {
            _tokenTransferFromTo(
                request.tokenOut,
                requestRedeemer,
                request.recipient,
                calcResult.amountTokenOutWithoutFee,
                calcResult.tokenOutDecimals
            );
            request.status = RequestStatus.Processed;
        }

        _tokenTransferFromTo(
            request.tokenOut,
            requestRedeemer,
            feeReceiver,
            calcResult.feeAmount,
            calcResult.tokenOutDecimals
        );

        _requireAndUpdateAllowance(
            request.tokenOut,
            calcResult.amountTokenOutWithoutFee
        );

        mToken.burn(requestRedeemer, request.amountMToken);

        request.amountTokenOut = calcResult.amountTokenOutWithoutFee;
        request.approvedMTokenRate = newMTokenRate;
        redeemRequests[requestId] = request;

        emit ApproveRequest(requestId, newMTokenRate, isSafe, isAvgRate);

        return true;
    }

    /**
     * @notice validates request
     * if exist
     * if status is pending
     * @param requestId request id
     * @param validateAddress address to check if not zero
     * @param status actual request status
     */
    function _validateRequest(
        uint256 requestId,
        address validateAddress,
        RequestStatus status
    ) private pure {
        _validateRequest(
            requestId,
            validateAddress,
            status,
            RequestStatus.Pending
        );
    }

    /**
     * @notice validates request
     * if exist
     * if status is expected
     * @param requestId request id
     * @param validateAddress address to check if not zero
     * @param status actual request status
     * @param expectedStatus expected status
     */
    function _validateRequest(
        uint256 requestId,
        address validateAddress,
        RequestStatus status,
        RequestStatus expectedStatus
    ) private pure {
        require(validateAddress != address(0), RequestNotExists(requestId));
        require(
            status == expectedStatus,
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
    ) private validateUserAccess(recipient) {
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

        _sendTokensFromLiquidity(tokenOut, recipient, calcResult);

        emit RedeemInstant(
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
     * @param recipientRequest recipient address for the request part
     * @param claimerRequest claimer address for the request part
     * @param instantShare % amount of `amountMTokenIn` that will be redeemed instantly
     * @param minReceiveAmountInstantShare min amount of tokenOut to receive for the instant share
     * @param recipientInstant recipient address for the instant part
     * @return requestId request id
     */
    function _redeemRequestWithCustomRecipient(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipientRequest,
        address claimerRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
    )
        private
        validateUserAccess(recipientRequest)
        returns (
            uint256 /* requestId */
        )
    {
        if (claimerRequest != address(0)) {
            _validateUserAccess(claimerRequest, false);
        }

        uint256 amountMTokenInInstant = (amountMTokenIn * instantShare) /
            ONE_HUNDRED_PERCENT;

        if (amountMTokenInInstant > 0) {
            _redeemInstantWithCustomRecipient(
                tokenOut,
                amountMTokenInInstant,
                minReceiveAmountInstantShare,
                recipientInstant,
                instantShare
            );
        }

        uint256 amountMTokenInRequest = amountMTokenIn - amountMTokenInInstant;

        return
            _redeemRequest(
                tokenOut,
                amountMTokenInRequest,
                recipientRequest,
                claimerRequest,
                amountMTokenInInstant
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

        require(
            calcResult.amountTokenOutWithoutFee >= minReceiveAmount,
            SlippageExceeded(
                minReceiveAmount,
                calcResult.amountTokenOutWithoutFee
            )
        );

        _requireAndUpdateAllowance(tokenOut, calcResult.amountTokenOut);

        mToken.burn(user, amountMTokenIn);
    }

    /**
     * @dev Sends tokens from liquidity to the recipient
     * @param tokenOut tokenOut address
     * @param recipient recipient address
     * @param calcResult calculated redeem result
     */
    function _sendTokensFromLiquidity(
        address tokenOut,
        address recipient,
        CalcAndValidateRedeemResult memory calcResult
    ) private {
        uint256 tokenOutBalanceBase18 = IERC20(tokenOut)
            .balanceOf(address(this))
            .convertToBase18(calcResult.tokenOutDecimals);

        uint256 totalAmount = calcResult.amountTokenOutWithoutFee +
            calcResult.feeAmount;

        uint256 usedLpLiquidity;
        uint256 lpFeePortion;

        if (preferLoanLiquidity) {
            (usedLpLiquidity, lpFeePortion) = _useLoanLpLiquidity(
                tokenOut,
                totalAmount,
                totalAmount,
                calcResult.tokenOutRate,
                calcResult.feeAmount,
                calcResult.tokenOutDecimals
            );
            uint256 newBalance = tokenOutBalanceBase18 + usedLpLiquidity;

            if (newBalance < totalAmount) {
                _useVaultLiquidity(
                    tokenOut,
                    totalAmount - newBalance,
                    calcResult.tokenOutRate,
                    newBalance,
                    calcResult.tokenOutDecimals
                );
            }
        } else if (tokenOutBalanceBase18 < totalAmount) {
            uint256 obtainedVaultLiquidity = _useVaultLiquidity(
                tokenOut,
                totalAmount - tokenOutBalanceBase18,
                calcResult.tokenOutRate,
                tokenOutBalanceBase18,
                calcResult.tokenOutDecimals
            );

            uint256 newBalance = tokenOutBalanceBase18 + obtainedVaultLiquidity;

            if (newBalance < totalAmount) {
                (usedLpLiquidity, lpFeePortion) = _useLoanLpLiquidity(
                    tokenOut,
                    totalAmount - newBalance,
                    totalAmount,
                    calcResult.tokenOutRate,
                    calcResult.feeAmount,
                    calcResult.tokenOutDecimals
                );
            }
        }

        uint256 vaultFeePortion = calcResult.feeAmount - lpFeePortion;

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

        if (usedLpLiquidity == 0) {
            return;
        }

        // we dont transfer lp fee portion just yet,
        // it will be transferred during the loan repayment

        uint256 loanRequestId = currentLoanRequestId.current();

        loanRequests[loanRequestId] = LiquidityProviderLoanRequest({
            tokenOut: tokenOut,
            amountTokenOut: usedLpLiquidity,
            amountFee: lpFeePortion,
            createdAt: block.timestamp,
            status: RequestStatus.Pending
        });
        currentLoanRequestId.increment();

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
     * @dev Check if contract has enough tokenOut balance for redeem,
     * if not, obtains liquidity trough the custom strategies.
     * In default implementation it does nothing.
     * @return obtainedLiquidityBase18 amount of tokenOut obtained
     */
    function _useVaultLiquidity(
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
     * @dev Check if contract has enough tokenOut balance for redeem;
     * if not, redeem the missing amount via loan LP liquidity
     * @param tokenOut tokenOut address
     * @param missingAmountBase18 amount of tokenOut needed in base 18
     * @param totalAmount total amount of tokenOut needed in base 18
     * @param tokenOutRate tokenOut rate
     * @param totalFee total fee of tokenOut
     * @param tokenOutDecimals decimals of tokenOut
     */
    function _useLoanLpLiquidity(
        address tokenOut,
        uint256 missingAmountBase18,
        uint256 totalAmount,
        uint256 tokenOutRate,
        uint256 totalFee,
        uint256 tokenOutDecimals
    )
        private
        returns (
            uint256, /* amountReceivedBase18 */
            uint256 /* feePortionBase18 */
        )
    {
        address _loanLp = loanLp;
        IRedemptionVault _loanSwapperVault = loanSwapperVault;

        if (missingAmountBase18 == 0) {
            return (0, 0);
        }

        require(
            _loanLp != address(0) && address(_loanSwapperVault) != address(0),
            LoanLpNotConfigured(_loanLp, address(_loanSwapperVault))
        );

        uint256 mTokenARate = _loanSwapperVault
            .mTokenDataFeed()
            .getDataInBase18();

        IERC20 mTokenA = IERC20(address(_loanSwapperVault.mToken()));

        uint256 grossTokenOutAmount = Math.mulDiv(
            mTokenA.balanceOf(_loanLp),
            mTokenARate,
            tokenOutRate,
            Math.Rounding.Up
        );

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

        uint256 tokenOutAmountToRedeem = grossTokenOutAmount - lpFeePortion;

        // Ceil so the inner vault's floored output is still >= net token out amount.
        // Requires address(this) to have waivedFeeRestriction on the inner vault.
        uint256 mTokenAAmount = Math.mulDiv(
            tokenOutAmountToRedeem,
            tokenOutRate,
            mTokenARate,
            Math.Rounding.Up
        );

        mTokenA.transferFrom(_loanLp, address(this), mTokenAAmount);

        mTokenA.safeIncreaseAllowance(
            address(_loanSwapperVault),
            mTokenAAmount
        );

        _loanSwapperVault.redeemInstant(
            _tokenOut,
            mTokenAAmount,
            tokenOutAmountToRedeem
        );

        return (tokenOutAmountToRedeem, lpFeePortion);
    }

    /**
     * @notice internal redeem request logic
     * @param tokenOut tokenOut address
     * @param amountMTokenIn amount of mToken (decimals 18)
     * @param recipient recipient address
     * @param claimer claimer address
     * @param amountMTokenInstant amount of mToken that was redeemed instantly
     *
     * @return requestId request id
     */
    function _redeemRequest(
        address tokenOut,
        uint256 amountMTokenIn,
        address recipient,
        address claimer,
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

        requestId = currentRequestId.current();
        currentRequestId.increment();

        uint256 feePercent = _getFee(user, tokenOut, false);

        redeemRequests[requestId] = Request({
            recipient: recipient,
            claimer: claimer,
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
            claimer,
            amountMTokenIn,
            amountMTokenInstant,
            mTokenRate,
            feePercent
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
        private
        view
        returns (
            bool /* success */
        )
    {
        uint256 balance = IERC20(token).balanceOf(requestRedeemer);
        return balance >= requiredLiquidity.convertFromBase18(tokenDecimals);
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
