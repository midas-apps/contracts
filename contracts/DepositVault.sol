// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IDepositVault, CommonVaultInitParams, DepositVaultInitParams, Request, RequestStatus} from "./interfaces/IDepositVault.sol";

import {ManageableVault} from "./abstract/ManageableVault.sol";
import {Greenlistable} from "./access/Greenlistable.sol";

/**
 * @title DepositVault
 * @notice Smart contract that handles mToken minting
 * @author RedDuck Software
 */
contract DepositVault is ManageableVault, IDepositVault {
    using SafeERC20 for IERC20;

    /**
     * @notice return data of _calcAndValidateDeposit
     * packed into a struct to avoid stack too deep errors
     */
    struct CalcAndValidateDepositResult {
        /// @notice tokenIn amount converted to USD
        uint256 tokenAmountInUsd;
        /// @notice fee amount in tokenIn
        uint256 feeTokenAmount;
        /// @notice tokenIn amount without fee
        uint256 amountTokenWithoutFee;
        /// @notice mToken amount for mint
        uint256 mintAmount;
        /// @notice tokenIn rate
        uint256 tokenInRate;
        /// @notice mToken rate
        uint256 tokenOutRate;
        /// @notice tokenIn decimals
        uint256 tokenDecimals;
    }

    /**
     * @notice request data storage
     */
    mapping(uint256 => Request) public mintRequests;

    /**
     * @dev how much mTokens were minted by the depositor
     * @dev depositor address => amount minted
     */
    mapping(address => uint256) public totalMinted;

    /**
     * @notice minimal USD amount for first user`s deposit
     */
    uint256 public minMTokenAmountForFirstDeposit;

    /**
     * @notice max supply cap value in mToken
     * @dev if after the deposit, mToken.totalSupply() > maxSupplyCap,
     * the tx will be reverted
     */
    uint256 public maxSupplyCap;

    /**
     * @notice max amount per request in mToken
     */
    uint256 public maxAmountPerRequest;

    /**
     * @notice pending supply in mToken that will be released
     * after the deposit request is processed
     */
    uint256 public upcomingSupply;

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
     * @param _depositVaultInitParams init params for deposit vault
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        DepositVaultInitParams calldata _depositVaultInitParams
    ) public initializer {
        __ManageableVault_init(_commonVaultInitParams);

        minMTokenAmountForFirstDeposit = _depositVaultInitParams
            .minMTokenAmountForFirstDeposit;
        maxSupplyCap = _depositVaultInitParams.maxSupplyCap;
        maxAmountPerRequest = _depositVaultInitParams.maxAmountPerRequest;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId
    )
        external
        returns (
            uint256 /* mintAmount */
        )
    {
        return
            _depositInstantWithCustomRecipient(
                tokenIn,
                amountToken,
                minReceiveAmount,
                referrerId,
                msg.sender,
                ONE_HUNDRED_PERCENT
            ).mintAmount;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId,
        address recipient
    )
        external
        returns (
            uint256 /* mintAmount */
        )
    {
        return
            _depositInstantWithCustomRecipient(
                tokenIn,
                amountToken,
                minReceiveAmount,
                referrerId,
                recipient,
                ONE_HUNDRED_PERCENT
            ).mintAmount;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId
    ) external returns (uint256 requestId) {
        (requestId, ) = _depositRequestWithCustomRecipient(
            tokenIn,
            amountToken,
            referrerId,
            msg.sender,
            0,
            0,
            msg.sender
        );
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId,
        address recipientRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
    )
        external
        returns (
            uint256, /*requestId*/
            uint256 /* instantMintAmount */
        )
    {
        return
            _depositRequestWithCustomRecipient(
                tokenIn,
                amountToken,
                referrerId,
                recipientRequest,
                instantShare,
                minReceiveAmountInstantShare,
                recipientInstant
            );
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            uint256 rate = mintRequests[requestIds[i]].tokenOutRate;
            bool success = _approveRequest(
                requestIds[i],
                rate,
                true,
                false,
                true
            );

            if (!success) {
                continue;
            }
        }
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequest(uint256[] calldata requestIds) external {
        uint256 currentMTokenRate = _getMTokenRate();
        _safeBulkApproveRequest(requestIds, currentMTokenRate, false);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequestAvgRate(uint256[] calldata requestIds)
        external
    {
        uint256 currentMTokenRate = _getMTokenRate();
        _safeBulkApproveRequest(requestIds, currentMTokenRate, true);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) external {
        _safeBulkApproveRequest(requestIds, newOutRate, false);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequestAvgRate(
        uint256[] calldata requestIds,
        uint256 avgMTokenRate
    ) external {
        _safeBulkApproveRequest(requestIds, avgMTokenRate, true);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function approveRequest(
        uint256 requestId,
        uint256 newOutRate,
        bool isAvgRate
    ) external onlyContractAdmin {
        _approveRequest(requestId, newOutRate, false, isAvgRate, false);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function rejectRequest(uint256 requestId) external onlyContractAdmin {
        Request memory request = mintRequests[requestId];

        _validateRequest(requestId, request.recipient, request.status);
        _validateAndUpdateNextRequestIdToProcess(requestId, true);

        mintRequests[requestId].status = RequestStatus.Canceled;

        upcomingSupply -= _quoteMTokenFromRequest(
            request,
            request.tokenOutRate
        );

        emit RejectRequest(requestId, request.recipient);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMinMTokenAmountForFirstDeposit(uint256 newValue)
        external
        onlyContractAdmin
    {
        minMTokenAmountForFirstDeposit = newValue;

        emit SetMinMTokenAmountForFirstDeposit(newValue);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMaxSupplyCap(uint256 newValue) external onlyContractAdmin {
        maxSupplyCap = newValue;

        emit SetMaxSupplyCap(newValue);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMaxAmountPerRequest(uint256 newValue)
        external
        onlyContractAdmin
    {
        maxAmountPerRequest = newValue;

        emit SetMaxAmountPerRequest(newValue);
    }

    /**
     * @notice calculates effective mToken supply including upcoming supply
     * @return effective mToken supply
     */
    function getEffectiveMTokenSupply() external view returns (uint256) {
        return _getEffectiveMTokenSupply();
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
    ) internal onlyContractAdmin {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            bool success = _approveRequest(
                requestIds[i],
                newOutRate,
                true,
                isAvgRate,
                true
            );

            if (!success) {
                continue;
            }
        }
    }

    /**
     * @dev internal deposit instant logic with custom recipient
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param minReceiveAmount min amount of mToken to receive (decimals 18)
     * @param referrerId referrer id
     * @param recipient recipient address
     * @param instantShareToValidate % amount of `amountToken` that will be deposited instantly
     */
    function _depositInstantWithCustomRecipient(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId,
        address recipient,
        uint256 instantShareToValidate
    )
        private
        validateUserAccess(recipient)
        returns (CalcAndValidateDepositResult memory result)
    {
        require(
            instantShareToValidate <= maxInstantShare,
            InstantShareTooHigh(instantShareToValidate, maxInstantShare)
        );

        result = _depositInstant(
            tokenIn,
            amountToken,
            minReceiveAmount,
            recipient
        );

        emit DepositInstant(
            msg.sender,
            tokenIn,
            recipient,
            result.tokenAmountInUsd,
            amountToken,
            result.feeTokenAmount,
            result.mintAmount,
            referrerId
        );
    }

    /**
     * @dev internal deposit instant logic
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param minReceiveAmount min amount of mToken to receive (decimals 18)
     * @param recipient recipient address
     *
     * @return result calculated deposit result
     */
    function _depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        address recipient
    ) internal virtual returns (CalcAndValidateDepositResult memory result) {
        address user = msg.sender;

        result = _calcAndValidateDeposit(user, tokenIn, amountToken, true);

        _requireSlippageNotExceeded(result.mintAmount, minReceiveAmount);

        totalMinted[user] += result.mintAmount;

        _requireAndUpdateLimit(result.mintAmount);

        _instantTransferTokensToTokensReceiver(
            tokenIn,
            result.amountTokenWithoutFee + result.feeTokenAmount,
            result.tokenDecimals
        );

        mToken.mint(recipient, result.mintAmount);

        _validateMaxSupplyCap(true);
    }

    /**
     * @dev internal deposit request logic with custom recipient
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param referrerId referrer id
     * @param recipientRequest recipient address for the request part
     * @param instantShare % amount of `amountToken` that will be deposited instantly
     * @param minReceiveAmountInstantShare min amount of mToken to receive for the instant share
     * @param recipientInstant recipient address for the instant part
     * @return requestId request id
     */
    function _depositRequestWithCustomRecipient(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId,
        address recipientRequest,
        uint256 instantShare,
        uint256 minReceiveAmountInstantShare,
        address recipientInstant
    )
        private
        validateUserAccess(recipientRequest)
        returns (
            uint256, /* requestId */
            uint256 /* instantMintAmount */
        )
    {
        uint256 amountTokenInstant = _truncate(
            (amountToken * instantShare) / ONE_HUNDRED_PERCENT,
            _tokenDecimals(tokenIn)
        );

        CalcAndValidateDepositResult memory instantResult;
        if (amountTokenInstant > 0) {
            instantResult = _depositInstantWithCustomRecipient(
                tokenIn,
                amountTokenInstant,
                minReceiveAmountInstantShare,
                referrerId,
                recipientInstant,
                instantShare
            );
        }

        uint256 amountTokenRequest = amountToken - amountTokenInstant;

        return (
            _depositRequest(
                tokenIn,
                amountTokenRequest,
                recipientRequest,
                referrerId,
                instantResult.tokenAmountInUsd
            ),
            instantResult.mintAmount
        );
    }

    /**
     * @dev internal deposit request logic
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param recipient recipient address
     * @param referrerId referrer id
     * @param depositedInstantUsdAmount amount of tokenIn that was deposited instantly in USD

     * @return requestId request id
     */
    function _depositRequest(
        address tokenIn,
        uint256 amountToken,
        address recipient,
        bytes32 referrerId,
        uint256 depositedInstantUsdAmount
    ) private returns (uint256 requestId) {
        address user = msg.sender;

        requestId = currentRequestId++;

        CalcAndValidateDepositResult
            memory calcResult = _calcAndValidateDeposit(
                user,
                tokenIn,
                amountToken,
                false
            );

        _requestTransferTokensToTokensReceiver(
            tokenIn,
            calcResult.amountTokenWithoutFee + calcResult.feeTokenAmount,
            calcResult.tokenDecimals
        );

        Request memory request = Request({
            recipient: recipient,
            tokenIn: tokenIn,
            status: RequestStatus.Pending,
            depositedUsdAmount: calcResult.tokenAmountInUsd,
            usdAmountWithoutFees: (calcResult.amountTokenWithoutFee *
                calcResult.tokenInRate) / 10**18,
            tokenOutRate: calcResult.tokenOutRate,
            depositedInstantUsdAmount: depositedInstantUsdAmount,
            approvedTokenOutRate: 0,
            amountMToken: 0
        });

        mintRequests[requestId] = request;

        // prevents stack too deep error
        {
            uint256 estimatedMintAmount = _quoteMTokenFromRequest(
                request,
                request.tokenOutRate
            );

            require(
                estimatedMintAmount <= maxAmountPerRequest,
                MaxAmountPerRequestExceeded(estimatedMintAmount)
            );

            upcomingSupply += estimatedMintAmount;
        }

        _validateMaxSupplyCap(true);

        emit DepositRequest(
            requestId,
            msg.sender,
            tokenIn,
            recipient,
            amountToken,
            calcResult.tokenAmountInUsd,
            calcResult.feeTokenAmount,
            calcResult.tokenOutRate,
            referrerId
        );
    }

    /**
     * @dev approving request
     * Checks price diviation if safe
     * Mints mTokens to user
     * @param requestId request id
     * @param newOutRate mToken rate
     * @param isSafe if true, approval is safe
     * @param isAvgRate if true, newOutRate is avg rate
     * @param safeValidateRequest if true, wont revert if supply is exceeded or request id is not sequential
     */
    function _approveRequest(
        uint256 requestId,
        uint256 newOutRate,
        bool isSafe,
        bool isAvgRate,
        bool safeValidateRequest
    )
        private
        returns (
            bool /* success */
        )
    {
        Request memory request = mintRequests[requestId];

        _validateRequest(requestId, request.recipient, request.status);
        _validateUserAccess(request.recipient, false);

        if (isSafe) {
            _validateMaxApproveRequestId(requestId);
            _requireVariationTolerance(request.tokenOutRate, newOutRate);
        }

        if (isAvgRate) {
            require(
                request.depositedInstantUsdAmount > 0,
                InvalidInstantAmount()
            );

            newOutRate = _calculateHoldbackPartRateFromAvg(request, newOutRate);
        }

        require(newOutRate > 0, InvalidNewMTokenRate());

        uint256 amountMToken = _quoteMTokenFromRequest(request, newOutRate);

        uint256 upcomingSupplyDecrease = _quoteMTokenFromRequest(
            request,
            request.tokenOutRate
        );

        if (
            !_validateMaxSupplyCap(
                upcomingSupplyDecrease,
                amountMToken,
                !safeValidateRequest
            ) ||
            !_validateAndUpdateNextRequestIdToProcess(
                requestId,
                !safeValidateRequest
            )
        ) {
            return false;
        }

        upcomingSupply -= upcomingSupplyDecrease;

        mToken.mint(request.recipient, amountMToken);

        totalMinted[request.recipient] += amountMToken;

        request.approvedTokenOutRate = newOutRate;
        request.amountMToken = amountMToken;
        request.status = RequestStatus.Processed;

        mintRequests[requestId] = request;

        emit ApproveRequest(requestId, newOutRate, isSafe, isAvgRate);

        return true;
    }

    /**
     * @dev internal transfer tokens to tokens receiver (instant deposits)
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param tokensDecimals tokens decimals
     */
    function _instantTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal virtual {
        _tokenTransferFromUser(
            tokenIn,
            tokensReceiver,
            amountToken,
            tokensDecimals
        );
    }

    /**
     * @dev internal transfer tokens to tokens receiver (deposit requests)
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param tokensDecimals tokens decimals
     */
    function _requestTransferTokensToTokensReceiver(
        address tokenIn,
        uint256 amountToken,
        uint256 tokensDecimals
    ) internal virtual {
        _tokenTransferFromUser(
            tokenIn,
            tokensReceiver,
            amountToken,
            tokensDecimals
        );
    }

    /**
     * @notice validates request
     * if exist
     * if status is expected
     * @param requestId request id
     * @param validateAddress address to check if not zero
     * @param status request status
     */
    function _validateRequest(
        uint256 requestId,
        address validateAddress,
        RequestStatus status
    ) internal pure {
        require(validateAddress != address(0), RequestNotExists(requestId));
        require(
            status == RequestStatus.Pending,
            UnexpectedRequestStatus(requestId, status)
        );
    }

    /**
     * @dev validate deposit and calculate mint amount
     * @param user user address
     * @param tokenIn tokenIn address
     * @param amountToken tokenIn amount (decimals 18)
     * @param isInstant is instant operation
     *
     * @return result calculated deposit result
     */
    function _calcAndValidateDeposit(
        address user,
        address tokenIn,
        uint256 amountToken,
        bool isInstant
    ) internal returns (CalcAndValidateDepositResult memory result) {
        require(amountToken > 0, InvalidAmount());

        _validateInstantFee();

        result.tokenDecimals = _tokenDecimals(tokenIn);

        _requireTokenExists(tokenIn);

        (uint256 amountInUsd, uint256 tokenInUSDRate) = _convertTokenToUsd(
            tokenIn,
            amountToken
        );
        result.tokenAmountInUsd = amountInUsd;
        result.tokenInRate = tokenInUSDRate;
        address userCopy = user;

        _requireAndUpdateAllowance(tokenIn, amountToken);

        result.feeTokenAmount = _truncate(
            _getFeeAmount(_getFee(userCopy, tokenIn, isInstant), amountToken),
            result.tokenDecimals
        );

        result.amountTokenWithoutFee = amountToken - result.feeTokenAmount;

        uint256 feeInUsd = (result.feeTokenAmount * result.tokenInRate) /
            10**18;

        (uint256 mTokenAmount, uint256 mTokenRate) = _convertUsdToMToken(
            result.tokenAmountInUsd - feeInUsd
        );
        result.mintAmount = mTokenAmount;
        result.tokenOutRate = mTokenRate;

        if (
            !_validateMTokenAmount(userCopy, result.mintAmount) &&
            totalMinted[userCopy] == 0
        ) {
            require(
                result.mintAmount >= minMTokenAmountForFirstDeposit,
                LessThanMinAmountFirstDeposit(
                    result.mintAmount,
                    minMTokenAmountForFirstDeposit
                )
            );
        }
    }

    /**
     * @dev validates that mToken.totalSupply() <= maxSupplyCap
     *
     * @param revertOnError if true, will revert if supply is exceeded
     * if false, will return false if supply is exceeded without reverting
     *
     * @return true if supply is valid, false otherwise
     */
    function _validateMaxSupplyCap(bool revertOnError)
        internal
        view
        returns (bool)
    {
        return _validateMaxSupplyCap(0, 0, revertOnError);
    }

    /**
     * @dev validates that mToken.totalSupply() <= maxSupplyCap
     *
     * @param requestEstimatedMintAmount estimated amount of mToken to mint from request
     * @param mintAmount amount of mToken to mint
     * @param revertOnError if true, will revert if supply is exceeded
     * if false, will return false if supply is exceeded without reverting
     *
     * @return true if supply is valid, false otherwise
     */
    function _validateMaxSupplyCap(
        uint256 requestEstimatedMintAmount,
        uint256 mintAmount,
        bool revertOnError
    ) private view returns (bool) {
        bool isExceeded = _getEffectiveMTokenSupply() +
            mintAmount -
            requestEstimatedMintAmount >
            maxSupplyCap;

        if (!revertOnError) {
            return !isExceeded;
        }

        require(!isExceeded, SupplyCapExceeded());

        return true;
    }

    /**
     * @dev calculates USD amount from tokenIn amount
     * @param tokenIn tokenIn address
     * @param amount amount of tokenIn (decimals 18)
     *
     * @return amountInUsd converted amount to USD
     * @return rate conversion rate
     */
    function _convertTokenToUsd(address tokenIn, uint256 amount)
        internal
        view
        virtual
        returns (uint256 amountInUsd, uint256 rate)
    {
        rate = _getPTokenRate(tokenIn);

        amountInUsd = (amount * rate) / (10**18);
    }

    /**
     * @dev calculates mToken amount from USD amount
     * @param amountUsd amount of USD (decimals 18)
     *
     * @return amountMToken converted USD to mToken
     * @return mTokenRate conversion rate
     */
    function _convertUsdToMToken(uint256 amountUsd)
        internal
        view
        virtual
        returns (uint256 amountMToken, uint256 mTokenRate)
    {
        mTokenRate = _getMTokenRate();

        amountMToken = (amountUsd * (10**18)) / mTokenRate;
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
        if (avgMTokenRate == 0 || request.tokenOutRate == 0) {
            return 0;
        }

        uint256 targetTotalMTokenValue = ((request.depositedUsdAmount +
            request.depositedInstantUsdAmount) * (10**18)) / avgMTokenRate;

        uint256 instantPartMTokenValue = (request.depositedInstantUsdAmount *
            (10**18)) / request.tokenOutRate;

        if (targetTotalMTokenValue <= instantPartMTokenValue) {
            return 0;
        }

        uint256 holdbackPartValue = targetTotalMTokenValue -
            instantPartMTokenValue;

        return (request.depositedUsdAmount * (10**18)) / holdbackPartValue;
    }

    /**
     * @dev calculates mToken amount to mint from request and provided mToken rate
     * @param request request
     * @param mTokenRate mToken rate
     * @return mToken amount to mint
     */
    function _quoteMTokenFromRequest(Request memory request, uint256 mTokenRate)
        private
        view
        returns (uint256)
    {
        return (request.usdAmountWithoutFees * (10**18)) / mTokenRate;
    }

    /**
     * @dev calculates effective mToken supply including upcoming supply
     * @return effective mToken supply
     */
    function _getEffectiveMTokenSupply() private view returns (uint256) {
        return mToken.totalSupply() + upcomingSupply;
    }
}
