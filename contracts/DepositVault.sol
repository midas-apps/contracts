// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {IDepositVault, CommonVaultInitParams, CommonVaultV2InitParams, Request, RequestStatus} from "./interfaces/IDepositVault.sol";

import {ManageableVault} from "./abstract/ManageableVault.sol";

/**
 * @title DepositVault
 * @notice Smart contract that handles mToken minting
 * @author RedDuck Software
 */
contract DepositVault is ManageableVault, IDepositVault {
    using Counters for Counters.Counter;
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
     * @dev default role that grants admin rights to the contract
     * keccak256("DEPOSIT_VAULT_ADMIN_ROLE");
     */
    bytes32 private constant _DEFAULT_DEPOSIT_VAULT_ADMIN_ROLE =
        0x2728bd32a7e1e24afac41a073e9c92dbb65527c9ec3baa2a8d5ee1d06c0fa779;

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
     * @notice max supply cap value in mToken
     * @dev if after the deposit, mToken.totalSupply() > maxSupplyCap,
     * the tx will be reverted
     */
    uint256 public maxSupplyCap;

    /**
     * @dev leaving a storage gap for futures updates
     *
     * used slots:
     * 50 - `maxSupplyCap`
     */
    uint256[49] private __gap;

    /**
     * @notice upgradeable pattern contract`s initializer
     * @dev Calls all versioned initializers (V1, V2, ...) in chronological order.
     * This ensures that every deployment, whether fresh or upgraded, ends up
     * initialized to the latest contract state without breaking the
     * initializer/reinitializer versioning rules.
     * @param _commonVaultInitParams init params for common vault
     * @param _commonVaultV2InitParams init params for common vault v2
     * @param _minMTokenAmountForFirstDeposit min amount for first deposit in mToken
     * @param _maxSupplyCap max supply cap for mToken
     */
    function initialize(
        CommonVaultInitParams calldata _commonVaultInitParams,
        CommonVaultV2InitParams calldata _commonVaultV2InitParams,
        uint256 _minMTokenAmountForFirstDeposit,
        uint256 _maxSupplyCap
    ) public {
        initializeV1(_commonVaultInitParams, _minMTokenAmountForFirstDeposit);
        initializeV2(_maxSupplyCap);
        initializeV3(_commonVaultV2InitParams);
    }

    /**
     * @notice v1 initializer
     * @param _commonVaultInitParams init params for common vault
     * @param _minMTokenAmountForFirstDeposit min amount for first deposit in mToken
     */
    function initializeV1(
        CommonVaultInitParams calldata _commonVaultInitParams,
        uint256 _minMTokenAmountForFirstDeposit
    ) public initializer {
        __ManageableVault_init(_commonVaultInitParams);
        minMTokenAmountForFirstDeposit = _minMTokenAmountForFirstDeposit;
    }

    /**
     * @notice v2 initializer
     * @param _maxSupplyCap max supply cap for mToken
     */
    function initializeV2(uint256 _maxSupplyCap) public reinitializer(2) {
        maxSupplyCap = _maxSupplyCap;
    }

    /**
     * @notice v2 initializer
     * @param _commonVaultV2InitParams init params for common vault v2
     */
    function initializeV3(
        CommonVaultV2InitParams calldata _commonVaultV2InitParams
    ) public reinitializer(3) {
        __ManageableVault_initV2(_commonVaultV2InitParams);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function depositInstant(
        address tokenIn,
        uint256 amountToken,
        uint256 minReceiveAmount,
        bytes32 referrerId
    ) external validateUserAccess(msg.sender) {
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
    ) external validateUserAccess(recipient) {
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
        validateUserAccess(msg.sender)
        returns (
            uint256 /*requestId*/
        )
    {
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
        validateUserAccess(recipient)
        returns (
            uint256 /*requestId*/
        )
    {
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
    function safeBulkApproveRequestAtSavedRate(uint256[] calldata requestIds)
        external
        validateVaultAdminAccess
    {
        for (uint256 i = 0; i < requestIds.length; i++) {
            uint256 rate = mintRequests[requestIds[i]].tokenOutRate;
            bool success = _approveRequest(requestIds[i], rate, true, false);

            if (!success) {
                continue;
            }

            emit SafeApproveRequest(requestIds[i], rate);
        }
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
        validateVaultAdminAccess
    {
        _approveRequest(requestId, newOutRate, true, true);

        emit SafeApproveRequest(requestId, newOutRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function approveRequest(uint256 requestId, uint256 newOutRate)
        external
        validateVaultAdminAccess
    {
        _approveRequest(requestId, newOutRate, false, true);

        emit ApproveRequest(requestId, newOutRate);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function rejectRequest(uint256 requestId)
        external
        validateVaultAdminAccess
    {
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
        validateVaultAdminAccess
    {
        minMTokenAmountForFirstDeposit = newValue;

        emit SetMinMTokenAmountForFirstDeposit(msg.sender, newValue);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function setMaxSupplyCap(uint256 newValue)
        external
        validateVaultAdminAccess
    {
        maxSupplyCap = newValue;

        emit SetMaxSupplyCap(msg.sender, newValue);
    }

    /**
     * @inheritdoc IDepositVault
     */
    function safeBulkApproveRequest(
        uint256[] calldata requestIds,
        uint256 newOutRate
    ) public validateVaultAdminAccess {
        for (uint256 i = 0; i < requestIds.length; i++) {
            bool success = _approveRequest(
                requestIds[i],
                newOutRate,
                true,
                false
            );

            if (!success) {
                continue;
            }

            emit SafeApproveRequest(requestIds[i], newOutRate);
        }
    }

    /**
     * @inheritdoc ManageableVault
     */
    function vaultRole() public pure virtual override returns (bytes32) {
        return _DEFAULT_DEPOSIT_VAULT_ADMIN_ROLE;
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

        _validateMaxSupplyCap(true);
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

        _requestTransferTokensToTokensReceiver(
            tokenIn,
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
        bool isSafe,
        bool revertAboveSupplyCap
    )
        private
        returns (
            bool /* success */
        )
    {
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

        if (!_validateMaxSupplyCap(amountMToken, revertAboveSupplyCap)) {
            return false;
        }

        mToken.mint(request.sender, amountMToken);

        totalMinted[request.sender] += amountMToken;

        request.status = RequestStatus.Processed;
        request.tokenOutRate = newOutRate;
        mintRequests[requestId] = request;

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

        if (!isFreeFromMinAmount[userCopy]) {
            _validateMinAmount(userCopy, result.mintAmount);
        }
        require(result.mintAmount > 0, "DV: invalid mint amount");
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
        return _validateMaxSupplyCap(0, revertOnError);
    }

    /**
     * @dev validates that mToken.totalSupply() <= maxSupplyCap
     *
     * @param mintAmount amount of mToken to mint
     * @param revertOnError if true, will revert if supply is exceeded
     * if false, will return false if supply is exceeded without reverting
     *
     * @return true if supply is valid, false otherwise
     */
    function _validateMaxSupplyCap(uint256 mintAmount, bool revertOnError)
        internal
        view
        returns (bool)
    {
        bool isExceeded = mToken.totalSupply() + mintAmount > maxSupplyCap;

        if (!revertOnError) {
            return !isExceeded;
        }

        require(!isExceeded, "DV: max supply cap exceeded");

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
        require(amount > 0, "DV: amount zero");

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
}
