// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import "./interfaces/IDepositVault.sol";
import "./interfaces/IMTbill.sol";
import "./interfaces/IDataFeed.sol";

import "./abstract/ManageableVault.sol";

/**
 * @title DepositVault
 * @notice Smart contract that handles mTBILL minting
 * @author RedDuck Software
 */
contract DepositVault is ManageableVault, IDepositVault {
    using Counters for Counters.Counter;

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
     * @dev selector for deposit instant
     */
    bytes4 private constant _DEPOSIT_INSTANT_SELECTOR =
        bytes4(keccak256("depositInstant(address,uint256,uint256,bytes32)"));

    /**
     * @dev selector for deposit instant with custom recipient
     */
    bytes4 private constant _DEPOSIT_INSTANT_WITH_CUSTOM_RECIPIENT_SELECTOR =
        bytes4(
            keccak256("depositInstant(address,uint256,uint256,bytes32,address)")
        );

    /**
     * @dev selector for deposit request
     */
    bytes4 private constant _DEPOSIT_REQUEST_SELECTOR =
        bytes4(keccak256("depositRequest(address,uint256,bytes32)"));

    /**
     * @dev selector for deposit request with custom recipient
     */
    bytes4 private constant _DEPOSIT_REQUEST_WITH_CUSTOM_RECIPIENT_SELECTOR =
        bytes4(keccak256("depositRequest(address,uint256,bytes32,address)"));

    /**
     * @notice minimal USD amount for first user`s deposit
     */
    uint256 public minMTokenAmountForFirstDeposit;

    /**
     * @notice mapping, requestId => request data
     */
    mapping(uint256 => Request) public mintRequests;

    /**
     * @dev depositor address => amount minted
     */
    mapping(address => uint256) public totalMinted;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

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
     */
    function initialize(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        uint256 _minMTokenAmountForFirstDeposit
    ) external initializer {
        __DepositVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount,
            _minMTokenAmountForFirstDeposit
        );
    }

    // solhint-disable func-name-mixedcase
    function __DepositVault_init(
        address _ac,
        MTokenInitParams calldata _mTokenInitParams,
        ReceiversInitParams calldata _receiversInitParams,
        InstantInitParams calldata _instantInitParams,
        address _sanctionsList,
        uint256 _variationTolerance,
        uint256 _minAmount,
        uint256 _minMTokenAmountForFirstDeposit
    ) internal onlyInitializing {
        __ManageableVault_init(
            _ac,
            _mTokenInitParams,
            _receiversInitParams,
            _instantInitParams,
            _sanctionsList,
            _variationTolerance,
            _minAmount
        );
        minMTokenAmountForFirstDeposit = _minMTokenAmountForFirstDeposit;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId
    ) external whenFnNotPaused(_DEPOSIT_INSTANT_SELECTOR) {
        _validateUserAccess(msg.sender);

        CalcAndValidateDepositResult memory result = _depositInstant(
            tokenIn,
            amountToken,
            minReceiveAmount,
            msg.sender
        );

        emit DepositInstant(
            msg.sender,
            tokenIn,
            result.tokenAmountInUsd,
            amountToken,
            result.feeTokenAmount,
            result.mintAmount,
            referrerId
        );
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
        whenFnNotPaused(_DEPOSIT_INSTANT_WITH_CUSTOM_RECIPIENT_SELECTOR)
    {
        _validateUserAccess(msg.sender);

        if (recipient != msg.sender) {
            _validateUserAccess(recipient);
        }

        CalcAndValidateDepositResult memory result = _depositInstant(
            tokenIn,
            amountToken,
            minReceiveAmount,
            recipient
        );

        emit DepositInstantWithCustomRecipient(
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
     * @inheritdoc IDepositVault
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId
    )
        external
        whenFnNotPaused(_DEPOSIT_REQUEST_SELECTOR)
        returns (
            uint256 /*requestId*/
        )
    {
        _validateUserAccess(msg.sender);

        (
            uint256 requestId,
            CalcAndValidateDepositResult memory calcResult
        ) = _depositRequest(tokenIn, amountToken, msg.sender);

        emit DepositRequest(
            requestId,
            msg.sender,
            tokenIn,
            amountToken,
            calcResult.tokenAmountInUsd,
            calcResult.feeTokenAmount,
            calcResult.tokenOutRate,
            referrerId
        );

        return requestId;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositRequest(
        address tokenIn,
        uint256 amountToken,
        bytes32 referrerId,
        address recipient
    )
        external
        whenFnNotPaused(_DEPOSIT_REQUEST_WITH_CUSTOM_RECIPIENT_SELECTOR)
        returns (
            uint256 /*requestId*/
        )
    {
        _validateUserAccess(msg.sender);

        if (recipient != msg.sender) {
            _validateUserAccess(recipient);
        }

        (
            uint256 requestId,
            CalcAndValidateDepositResult memory calcResult
        ) = _depositRequest(tokenIn, amountToken, recipient);

        bytes32 referrerIdCopy = referrerId;

        emit DepositRequestWithCustomRecipient(
            requestId,
            msg.sender,
            tokenIn,
            recipient,
            amountToken,
            calcResult.tokenAmountInUsd,
            calcResult.feeTokenAmount,
            calcResult.tokenOutRate,
            referrerIdCopy
        );

        return requestId;
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequest(uint256[] calldata requestIds) external {
        uint256 currentMTokenRate = _getMTokenRate();
        safeBulkApproveRequest(requestIds, currentMTokenRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeApproveRequest(uint256 requestId, uint256 newOutRate)
        external
        onlyVaultAdmin
    {
        _approveRequest(requestId, newOutRate, true);

        emit SafeApproveRequest(requestId, newOutRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function approveRequest(uint256 requestId, uint256 newOutRate)
        external
        onlyVaultAdmin
    {
        _approveRequest(requestId, newOutRate, false);

        emit ApproveRequest(requestId, newOutRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function rejectRequest(uint256 requestId) external onlyVaultAdmin {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(
            request.status == RequestStatus.Pending,
            "DV: request not pending"
        );

        mintRequests[requestId].status = RequestStatus.Canceled;

        emit RejectRequest(requestId, request.sender);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMinMTokenAmountForFirstDeposit(uint256 newValue)
        external
        onlyVaultAdmin
    {
        minMTokenAmountForFirstDeposit = newValue;

        emit SetMinMTokenAmountForFirstDeposit(msg.sender, newValue);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) public onlyVaultAdmin {
        for (uint256 i = 0; i < requestIds.length; i++) {
            _approveRequest(requestIds[i], newOutRate, true);
            emit SafeApproveRequest(requestIds[i], newOutRate);
        }
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return DEPOSIT_VAULT_ADMIN_ROLE;
    }

    /**
     * @dev validates that inputted USD amount >= minAmountToDepositInUsd()
     * and amount >= minAmount()
     * @param user user address
     * @param amountMTokenWithoutFee amount of mToken without fee (decimals 18)
     */
    function _validateMinAmount(address user, uint256 amountMTokenWithoutFee)
        internal
        view
    {
        require(amountMTokenWithoutFee >= minAmount, "DV: mToken amount < min");

        if (totalMinted[user] != 0) return;

        require(
            amountMTokenWithoutFee >= minMTokenAmountForFirstDeposit,
            "DV: mint amount < min"
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

        require(
            result.mintAmount >= minReceiveAmount,
            "DV: minReceiveAmount > actual"
        );

        totalMinted[user] += result.mintAmount;

        _requireAndUpdateLimit(result.mintAmount);

        _instantTransferTokensToTokensReceiver(
            tokenIn,
            result.amountTokenWithoutFee,
            result.tokenDecimals
        );

        if (result.feeTokenAmount > 0)
            _tokenTransferFromUser(
                tokenIn,
                feeReceiver,
                result.feeTokenAmount,
                result.tokenDecimals
            );

        mToken.mint(recipient, result.mintAmount);
    }

    /**
     * @dev internal deposit request logic
     * @param tokenIn tokenIn address
     * @param amountToken amount of tokenIn (decimals 18)
     * @param recipient recipient address
     *
     * @return requestId request id
     * @return calcResult calculated deposit result
     */
    function _depositRequest(
        address tokenIn,
        uint256 amountToken,
        address recipient
    )
        private
        returns (
            uint256 requestId,
            CalcAndValidateDepositResult memory calcResult
        )
    {
        address user = msg.sender;

        requestId = currentRequestId.current();
        currentRequestId.increment();

        calcResult = _calcAndValidateDeposit(user, tokenIn, amountToken, false);

        _tokenTransferFromUser(
            tokenIn,
            tokensReceiver,
            calcResult.amountTokenWithoutFee,
            calcResult.tokenDecimals
        );

        if (calcResult.feeTokenAmount > 0)
            _tokenTransferFromUser(
                tokenIn,
                feeReceiver,
                calcResult.feeTokenAmount,
                calcResult.tokenDecimals
            );

        mintRequests[requestId] = Request({
            sender: recipient,
            tokenIn: tokenIn,
            status: RequestStatus.Pending,
            depositedUsdAmount: calcResult.tokenAmountInUsd,
            usdAmountWithoutFees: (calcResult.amountTokenWithoutFee *
                calcResult.tokenInRate) / 10**18,
            tokenOutRate: calcResult.tokenOutRate
        });
    }

    /**
     * @dev approving request
     * Checks price diviation if safe
     * Mints mTokens to user
     * @param requestId request id
     * @param newOutRate mToken rate
     */
    function _approveRequest(
        uint256 requestId,
        uint256 newOutRate,
        bool isSafe
    ) private {
        Request memory request = mintRequests[requestId];

        require(request.sender != address(0), "DV: request not exist");
        require(
            request.status == RequestStatus.Pending,
            "DV: request not pending"
        );

        if (isSafe)
            _requireVariationTolerance(request.tokenOutRate, newOutRate);

        uint256 amountMToken = (request.usdAmountWithoutFees * (10**18)) /
            newOutRate;

        mToken.mint(request.sender, amountMToken);

        totalMinted[request.sender] += amountMToken;

        request.status = RequestStatus.Processed;
        request.tokenOutRate = newOutRate;
        mintRequests[requestId] = request;
    }

    /**
     * @dev internal transfer tokens to tokens receiver
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
        require(amountToken > 0, "DV: invalid amount");

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
            _getFeeAmount(userCopy, tokenIn, amountToken, isInstant, 0),
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

        if (!isFreeFromMinAmount[userCopy]) {
            _validateMinAmount(userCopy, result.mintAmount);
        }
        require(result.mintAmount > 0, "DV: invalid mint amount");
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
        require(amount > 0, "DV: amount zero");

        TokenConfig storage tokenConfig = tokensConfig[tokenIn];

        rate = _getTokenRate(tokenConfig.dataFeed, tokenConfig.stable);
        require(rate > 0, "DV: rate zero");

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
     * @dev gets and validates mToken rate
     * @return mTokenRate mToken rate
     */
    function _getMTokenRate() private view returns (uint256 mTokenRate) {
        mTokenRate = _getTokenRate(address(mTokenDataFeed), false);
        require(mTokenRate > 0, "DV: rate zero");
    }
}
