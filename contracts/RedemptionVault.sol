// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {IRedemptionVault, CommonVaultInitParams, CommonVaultV2InitParams, LiquidityProviderLoanRequest, Request, RequestV2, RequestStatus, RedemptionVaultInitParams, RedemptionVaultV2InitParams} from "./interfaces/IRedemptionVault.sol";
import {ManageableVault} from "./abstract/ManageableVault.sol";

import "hardhat/console.sol";

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
     * @dev legacy variable kept for layout compatibility
     * @custom:oz-renamed-from minFiatRedeemAmount
     */
    // solhint-disable-next-line var-name-mixedcase
    uint256 private _minFiatRedeemAmount_deprecated;

    /**
     * @dev legacy variable kept for layout compatibility
     * @custom:oz-renamed-from fiatAdditionalFee
     */
    // solhint-disable-next-line var-name-mixedcase
    uint256 private _fiatAdditionalFee_deprecated;

    /**
     * @dev legacy variable kept for layout compatibility
     * @custom:oz-renamed-from fiatFlatFee
     */
    // solhint-disable-next-line var-name-mixedcase
    uint256 private _fiatFlatFee_deprecated;

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
     * @notice maximum loan APR value in basis points (100 = 1%)
     */
    uint64 public maxLoanApr;

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
        _validateAddress(_redemptionInitParams.requestRedeemer, false);

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
        maxLoanApr = _redemptionVaultV2InitParams.maxLoanApr;
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
        validateVaultAdminAccess
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
        validateVaultAdminAccess
    {
        _approveRequest(requestId, newMTokenRate, false, false, false);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function approveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate)
        external
        validateVaultAdminAccess
    {
        _approveRequest(requestId, avgMTokenRate, false, false, true);
    }

    /**
     * @inheritdoc IRedemptionVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newMTokenRate)
        external
        validateVaultAdminAccess
    {
        _approveRequest(requestId, newMTokenRate, true, false, false);
    }

    function safeApproveRequestAvgRate(uint256 requestId, uint256 avgMTokenRate)
        external
        validateVaultAdminAccess
    {
        _approveRequest(requestId, avgMTokenRate, true, false, true);
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
    function bulkRepayLpLoanRequest(
        uint256[] calldata requestIds,
        uint64 loanApr
    ) external validateVaultAdminAccess {
        require(loanApr <= maxLoanApr, "RV: loanApr > maxLoanApr");

        for (uint256 i = 0; i < requestIds.length; ++i) {
            LiquidityProviderLoanRequest memory request = loanRequests[
                requestIds[i]
            ];

            _validateRequest(request.tokenOut, request.status);

            uint256 decimals = _tokenDecimals(request.tokenOut);
            uint256 duration = block.timestamp - request.createdAt;
            uint256 accruedInterest = (request.amountTokenOut *
                loanApr *
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
                    "RV: !loanLpFeeReceiver"
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
    function setMaxLoanApr(uint64 newMaxLoanApr)
        external
        validateVaultAdminAccess
    {
        maxLoanApr = newMaxLoanApr;

        emit SetMaxLoanApr(msg.sender, newMaxLoanApr);
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
        uint256 newOutRate,
        bool isAvgRate
    ) internal validateVaultAdminAccess {
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
        internal
        returns (
            bool /* success */
        )
    {
        RequestV2 memory request = redeemRequests[requestId];

        _validateRequest(request.sender, request.status);

        require(request.version == 1, "RV: not v2 request");

        if (isSafe) {
            require(requestId <= maxApproveRequestId, "RV: !requestId");
            _requireVariationTolerance(request.mTokenRate, newMTokenRate);
        }

        if (isAvgRate) {
            require(
                request.amountMTokenInstant > 0,
                "RV: !amountMTokenInstant"
            );
            newMTokenRate = _calculateHoldbackPartRateFromAvg(
                request,
                newMTokenRate
            );
        }

        require(newMTokenRate > 0, "RV: !newMTokenRate");

        CalcAndValidateRedeemResult memory calcResult = _calcAndValidateRedeem(
            request.sender,
            request.tokenOut,
            request.amountMToken,
            newMTokenRate,
            request.tokenOutRate,
            true,
            request.feePercent,
            false
        );

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

        _requireAndUpdateAllowance(
            request.tokenOut,
            calcResult.amountTokenOutWithoutFee
        );

        mToken.burn(requestRedeemer, request.amountMToken);

        request.status = RequestStatus.Processed;
        request.approvedMTokenRate = newMTokenRate;
        redeemRequests[requestId] = request;

        emit ApproveRequestV2(requestId, newMTokenRate, isSafe, isAvgRate);

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
     * @param instantShareToValidate % amount of instant share to validate
     */
    function _redeemInstantWithCustomRecipient(
        address tokenOut,
        uint256 amountMTokenIn,
        uint256 minReceiveAmount,
        address recipient,
        uint256 instantShareToValidate
    ) private validateUserAccess(recipient) {
        require(instantShareToValidate <= maxInstantShare, "RV: !instantShare");

        CalcAndValidateRedeemResult memory calcResult = _redeemInstant(
            tokenOut,
            amountMTokenIn,
            minReceiveAmount,
            recipient
        );

        _postRedeemInstant(tokenOut, calcResult);

        _sendTokensFromLiquidity(tokenOut, recipient, calcResult);

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
            uint256 /* requestId */
        )
    {
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
    ) internal virtual returns (CalcAndValidateRedeemResult memory calcResult) {
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
                createdAt: block.timestamp,
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
    ) internal returns (uint256 requestId) {
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

        redeemRequests[requestId] = RequestV2({
            sender: recipient,
            tokenOut: tokenOut,
            status: RequestStatus.Pending,
            amountMToken: amountMTokenIn,
            mTokenRate: mTokenRate,
            tokenOutRate: tokenOutRate,
            feePercent: feePercent,
            amountMTokenInstant: amountMTokenInstant,
            approvedMTokenRate: 0,
            version: 1
        });

        emit RedeemRequestV2(
            requestId,
            msg.sender,
            tokenOut,
            recipient,
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
        require(amountUsd > 0, "RV: amount zero");

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
     */
    function _validateMTokenAmount(address user, uint256 amountMTokenIn)
        internal
        view
    {
        require(amountMTokenIn > 0, "RV: invalid amount");

        if (!isFreeFromMinAmount[user]) {
            require(minAmount <= amountMTokenIn, "RV: amount < min");
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

    /**
     * @dev calculates holdback part rate from avg rate
     * @param request request
     * @param avgMTokenRate avg mToken rate
     * @return holdback part rate
     */
    function _calculateHoldbackPartRateFromAvg(
        RequestV2 memory request,
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
