// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IFullRedemptionVault, FullRedemptionRequest, FullRedemptionStatus, FullRedemptionVaultInitParams} from "./interfaces/IFullRedemptionVault.sol";
import {IManageableVault} from "./interfaces/IManageableVault.sol";
import {IMidasAccessControl} from "./interfaces/IMidasAccessControl.sol";
import {IMidasPauseManager} from "./interfaces/IMidasPauseManager.sol";
import {IMToken} from "./interfaces/IMToken.sol";
import {IDataFeed} from "./interfaces/IDataFeed.sol";

import {ManageableVault} from "./abstract/ManageableVault.sol";
import {MidasInitializable} from "./abstract/MidasInitializable.sol";
import {WithSanctionsList} from "./abstract/WithSanctionsList.sol";
import {Blacklistable} from "./access/Blacklistable.sol";
import {Greenlistable} from "./access/Greenlistable.sol";
import {WithMidasAccessControl} from "./access/WithMidasAccessControl.sol";

import {DecimalsCorrectionLibrary} from "./libraries/DecimalsCorrectionLibrary.sol";
import {PauseGuardsLibrary} from "./libraries/PauseGuardsLibrary.sol";

/**
 * @title FullRedemptionVault
 * @notice Smart contract that handles full redemptions of mToken:
 * a wallet creates a request and pays a deposit, an admin reserves
 * liquidity for this request only, the wallet claims in steps
 * @dev it is linked to one redemption vault and reads the payment tokens,
 * the mToken data feed, the fee waivers and the tokens receiver from it.
 * All stored amounts have 18 decimals and are multiples of one unit
 * of their token, so a transfer never needs rounding
 * @author RedDuck Software
 */
contract FullRedemptionVault is
    IFullRedemptionVault,
    Blacklistable,
    Greenlistable,
    WithSanctionsList
{
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;

    /**
     * @notice 100 percent with base 100
     * @dev for example, 10% will be (10 * 100)%
     */
    uint256 public constant ONE_HUNDRED_PERCENT = 100 * 100;

    /**
     * @dev role that grants admin rights to the contract
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _CONTRACT_ADMIN_ROLE;

    /**
     * @dev role that grants greenlisted status to the contract
     * @custom:oz-upgrades-unsafe-allow state-variable-immutable
     */
    // solhint-disable-next-line var-name-mixedcase
    bytes32 private immutable _GREENLISTED_ROLE;

    /**
     * @notice linked redemption vault
     * @dev typed as the vault base contract, so that the compiler checks
     * every getter that is read from it
     */
    ManageableVault public redemptionVault;

    /**
     * @notice mToken token. Read from the linked vault at initialization
     */
    IMToken public mToken;

    /**
     * @notice last request id
     */
    uint256 public currentRequestId;

    /**
     * @notice mapping, token address to the amount that belongs to requests:
     * reserved liquidity, deposits and service fees (decimals 18)
     */
    mapping(address => uint256) public held;

    /**
     * @notice deposit as a share of the request value, 1% = 100
     */
    uint256 public depositPercentageBps;

    /**
     * @notice service fee in USD (decimals 18)
     */
    uint256 public serviceFeeAmount;

    /**
     * @notice address that receives service fees
     */
    address public serviceFeeReceiver;

    /**
     * @notice time in seconds from processing to the deadline of a request
     */
    uint256 public claimPeriod;

    /**
     * @notice largest difference between a safe processing rate
     * and the rate at request creation time, 1% = 100
     */
    uint256 public rateToleranceBps;

    /**
     * @notice largest difference between an adjusted rate
     * and the rate set at processing, 1% = 100
     */
    uint256 public maxRateAdjustmentBps;

    /**
     * @dev mapping, requestId to request data
     */
    mapping(uint256 => FullRedemptionRequest) private _requests;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @notice constructor
     * @param _contractAdminRole contract admin role
     * @param _greenlistedRole greenlisted role
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor(bytes32 _contractAdminRole, bytes32 _greenlistedRole)
        MidasInitializable()
    {
        _CONTRACT_ADMIN_ROLE = _contractAdminRole;
        _GREENLISTED_ROLE = _greenlistedRole;
    }

    /**
     * @notice upgradeable pattern contract`s initializer
     * @param _initParams init params
     */
    function initialize(FullRedemptionVaultInitParams calldata _initParams)
        external
        initializer
    {
        __WithMidasAccessControl_init(_initParams.ac);
        __WithSanctionsList_init_unchained(_initParams.sanctionsList);

        require(
            _initParams.redemptionVault != address(0),
            InvalidAddress(_initParams.redemptionVault)
        );
        require(
            _initParams.serviceFeeReceiver != address(0) ||
                _initParams.serviceFeeAmount == 0,
            InvalidAddress(_initParams.serviceFeeReceiver)
        );

        redemptionVault = ManageableVault(_initParams.redemptionVault);
        mToken = redemptionVault.mToken();

        serviceFeeReceiver = _initParams.serviceFeeReceiver;
        depositPercentageBps = _initParams.depositPercentageBps;
        serviceFeeAmount = _initParams.serviceFeeAmount;
        claimPeriod = _initParams.claimPeriod;
        rateToleranceBps = _initParams.rateToleranceBps;
        maxRateAdjustmentBps = _initParams.maxRateAdjustmentBps;
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function createRequest(
        address paymentToken,
        address depositAsset,
        uint256 amountMToken,
        uint256 maxPayAmount
    ) external returns (uint256 requestId) {
        _validateUserAccess(msg.sender, true);
        require(amountMToken > 0, IManageableVault.InvalidAmount());

        uint256 tokenFee = _requireStableToken(paymentToken);

        FullRedemptionRequest memory request;

        request.wallet = msg.sender;
        request.paymentToken = paymentToken;
        request.depositAsset = depositAsset;
        request.status = FullRedemptionStatus.Submitted;
        request.requested = amountMToken;
        request.remaining = amountMToken;
        request.savedRate = _getMTokenRate();
        request.feePercent = redemptionVault.waivedFeeRestriction(msg.sender)
            ? 0
            : tokenFee;

        // a fee of 100% leaves nothing to reserve,
        // so the request could never be processed
        require(
            request.feePercent < ONE_HUNDRED_PERCENT,
            IManageableVault.InvalidFee(request.feePercent)
        );

        if (depositAsset == address(mToken)) {
            // a deposit in mToken is a share of the requested mToken,
            // it needs no rate. The service fee is in USD
            request.depositLeft =
                (amountMToken * depositPercentageBps) /
                ONE_HUNDRED_PERCENT;
            request.serviceFee =
                (serviceFeeAmount * 10**18) /
                request.savedRate;
        } else {
            // the deposit asset counts as 1 USD only while its data feed is healthy
            _requireStableToken(depositAsset);

            uint256 depositDecimals = _tokenDecimals(depositAsset);

            request.depositLeft = _truncate(
                (amountMToken * request.savedRate * depositPercentageBps) /
                    (10**18 * ONE_HUNDRED_PERCENT),
                depositDecimals
            );
            request.serviceFee = _truncate(serviceFeeAmount, depositDecimals);
        }

        uint256 payAmount = request.depositLeft + request.serviceFee;

        require(
            payAmount <= maxPayAmount,
            MaxPayAmountExceeded(maxPayAmount, payAmount)
        );

        requestId = currentRequestId++;

        _requests[requestId] = request;
        held[depositAsset] += payAmount;

        _tokenTransferFromTo(
            depositAsset,
            msg.sender,
            address(this),
            payAmount,
            _tokenDecimals(depositAsset)
        );

        emit RequestCreated(
            requestId,
            msg.sender,
            paymentToken,
            depositAsset,
            amountMToken,
            request.depositLeft,
            request.serviceFee,
            request.feePercent,
            request.savedRate
        );
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function safeProcessAtSavedRateBulk(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        for (uint256 i = 0; i < requestIds.length; ++i) {
            _process(requestIds[i], _requests[requestIds[i]].savedRate, true);
        }
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function safeProcessAtCurrentRateBulk(uint256[] calldata requestIds)
        external
        onlyContractAdmin
    {
        uint256 rate = _getMTokenRate();

        for (uint256 i = 0; i < requestIds.length; ++i) {
            _process(requestIds[i], rate, true);
        }
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function safeProcessAtCustomRateBulk(
        uint256[] calldata requestIds,
        uint256[] calldata rates
    ) external onlyContractAdmin {
        require(
            requestIds.length == rates.length,
            IMidasAccessControl.MismatchArrays(requestIds.length, rates.length)
        );

        for (uint256 i = 0; i < requestIds.length; ++i) {
            _process(requestIds[i], rates[i], true);
        }
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function processAtCustomRate(uint256 requestId, uint256 rate)
        external
        onlyContractAdmin
    {
        _process(requestId, rate, false);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     * @dev claims that are already made do not change
     */
    function adjustRate(uint256 requestId, uint256 newRate)
        external
        onlyContractAdmin
    {
        FullRedemptionRequest storage request = _getRequest(requestId);

        _requireProcessed(requestId, request.status);
        require(newRate > 0, IManageableVault.InvalidNewMTokenRate());
        // the limit is measured from the rate set at processing,
        // so many small changes cannot add up
        _requireRateWithin(
            request.processedRate,
            newRate,
            maxRateAdjustmentBps
        );

        uint256 reserved = _reserve(request, newRate);

        emit ExchangeRateAdjusted(requestId, newRate, reserved);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function claim(
        uint256 requestId,
        uint256 amountMToken,
        uint256 minReceiveAmount
    ) external returns (uint256) {
        return _claim(requestId, amountMToken, minReceiveAmount, msg.sender);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function claim(
        uint256 requestId,
        uint256 amountMToken,
        uint256 minReceiveAmount,
        address recipient
    ) external returns (uint256) {
        return _claim(requestId, amountMToken, minReceiveAmount, recipient);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function reallocate(uint256 requestId) external onlyContractAdmin {
        FullRedemptionRequest storage request = _getRequest(requestId);

        _requireProcessed(requestId, request.status);
        require(
            block.timestamp > request.deadline || request.paused,
            DeadlineNotPassed(requestId, request.deadline)
        );

        address tokensReceiver = redemptionVault.tokensReceiver();
        address paymentToken = request.paymentToken;
        address depositAsset = request.depositAsset;
        uint256 reserved = request.reserved;
        uint256 depositLeft = request.depositLeft;

        request.status = FullRedemptionStatus.Reallocated;
        request.reserved = 0;
        request.depositLeft = 0;
        held[paymentToken] -= reserved;
        held[depositAsset] -= depositLeft;

        uint256 serviceFee = _releaseServiceFee(request);

        // all of the remaining deposit is seized. Nothing returns to the wallet.
        // A deposit in mToken is sent, not burned
        _tokenTransfer(depositAsset, tokensReceiver, depositLeft);
        _tokenTransfer(paymentToken, tokensReceiver, reserved);

        emit DepositSeized(requestId, tokensReceiver, depositLeft);
        emit RequestReclaimed(requestId, tokensReceiver, reserved);

        _transferServiceFee(requestId, depositAsset, serviceFee);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     * @dev the admin gives the refund address, because a transfer
     * to the wallet of the request can be impossible
     */
    function cancelRequest(uint256 requestId, address refundAddress)
        external
        onlyContractAdmin
    {
        FullRedemptionRequest storage request = _getRequest(requestId);

        require(
            request.status == FullRedemptionStatus.Submitted,
            InvalidRequestStatus(requestId, request.status)
        );
        require(refundAddress != address(0), InvalidAddress(refundAddress));

        address depositAsset = request.depositAsset;
        uint256 depositLeft = request.depositLeft;

        request.status = FullRedemptionStatus.Cancelled;
        request.depositLeft = 0;
        held[depositAsset] -= depositLeft;

        uint256 serviceFee = _releaseServiceFee(request);

        _tokenTransfer(depositAsset, refundAddress, depositLeft + serviceFee);

        emit RequestCancelled(
            requestId,
            refundAddress,
            depositLeft,
            serviceFee
        );
    }

    /**
     * @inheritdoc IFullRedemptionVault
     * @dev a request pause is for a compromised wallet, so it uses
     * the delays of the pause manager, as a pause of a contract does
     */
    function pauseRequest(uint256 requestId)
        external
        onlyRoleDelayOverride(
            contractAdminRole(),
            _pauseManager().pauseDelay(),
            true
        )
    {
        FullRedemptionRequest storage request = _getNotFinalRequest(requestId);

        require(!request.paused, RequestIsPaused(requestId));
        request.paused = true;

        emit RequestPaused(requestId);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function unpauseRequest(uint256 requestId)
        external
        onlyRoleDelayOverride(
            contractAdminRole(),
            _pauseManager().unpauseDelay(),
            true
        )
    {
        FullRedemptionRequest storage request = _getNotFinalRequest(requestId);

        require(request.paused, RequestNotPaused(requestId));
        request.paused = false;

        emit RequestUnpaused(requestId);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     * @dev the withdraw function of the other vaults has no limit.
     * This one cannot take what belongs to a request
     */
    function withdrawToken(address token, uint256 amount)
        external
        onlyContractAdmin
    {
        uint256 free = freeLiquidity(token);
        uint256 amountBase18 = amount.convertToBase18(_tokenDecimals(token));

        require(
            amountBase18 <= free,
            InsufficientFreeLiquidity(token, free, amountBase18)
        );

        address withdrawTo = redemptionVault.tokensReceiver();

        IERC20(token).safeTransfer(withdrawTo, amount);

        emit WithdrawToken(token, withdrawTo, amount);
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function getRequest(uint256 requestId)
        external
        view
        returns (FullRedemptionRequest memory)
    {
        return _requests[requestId];
    }

    /**
     * @inheritdoc IFullRedemptionVault
     */
    function freeLiquidity(address token) public view returns (uint256) {
        uint256 balance = IERC20(token)
            .balanceOf(address(this))
            .convertToBase18(_tokenDecimals(token));
        uint256 heldAmount = held[token];

        return balance > heldAmount ? balance - heldAmount : 0;
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public view virtual override returns (bytes32) {
        return _GREENLISTED_ROLE;
    }

    /**
     * @inheritdoc WithMidasAccessControl
     */
    function contractAdminRole()
        public
        view
        virtual
        override
        returns (bytes32)
    {
        return _CONTRACT_ADMIN_ROLE;
    }

    /**
     * @inheritdoc WithMidasAccessControl
     * @dev same as in ManageableVault: a paused function
     * cannot be called by an admin either
     */
    function _validateFunctionAccessWithTimelock(
        bytes32 role,
        uint32 overrideDelay,
        bool roleIsFunctionOperator,
        address account,
        bool validateFunctionRole
    ) internal view override {
        PauseGuardsLibrary.requireFnNotPaused(accessControl, msg.sig);

        super._validateFunctionAccessWithTimelock(
            role,
            overrideDelay,
            roleIsFunctionOperator,
            account,
            validateFunctionRole
        );
    }

    /**
     * @dev processes a request: sets its rate and its deadline
     * and reserves free liquidity for it. The wallet of the request
     * must pass the greenlist, the blacklist and the sanctions list
     * @param requestId request id
     * @param rate mToken/USD rate (decimals 18)
     * @param isSafe if true, the rate must be within `rateToleranceBps`
     * of the rate at request creation time
     */
    function _process(
        uint256 requestId,
        uint256 rate,
        bool isSafe
    ) private {
        FullRedemptionRequest storage request = _getRequest(requestId);

        require(
            request.status == FullRedemptionStatus.Submitted,
            InvalidRequestStatus(requestId, request.status)
        );
        // processing starts the claim period, so the wallet must be able
        // to claim. The redemption vault does the same check at approval
        _validateUserAccess(request.wallet, false);
        require(rate > 0, IManageableVault.InvalidNewMTokenRate());

        if (isSafe) {
            _requireRateWithin(request.savedRate, rate, rateToleranceBps);
        }

        uint256 reserved = _reserve(request, rate);

        // the deadline is the processing time plus one
        // claim period that is the same for all requests
        uint256 deadline = block.timestamp + claimPeriod;

        request.processedRate = rate;
        request.deadline = deadline;
        request.status = FullRedemptionStatus.ReadyToRedeem;

        emit RequestProcessed(requestId, rate, reserved, deadline);
    }

    /**
     * @dev sets the rate of a request and makes its reserved liquidity
     * equal to what the request needs at this rate. What it needs more
     * comes from free liquidity, what it needs less becomes free liquidity
     * @param request request
     * @param rate mToken/USD rate (decimals 18)
     * @return reserved new reserved amount (decimals 18)
     */
    function _reserve(FullRedemptionRequest storage request, uint256 rate)
        private
        returns (uint256 reserved)
    {
        address paymentToken = request.paymentToken;

        // after this check 1 payment token counts as 1 USD,
        // so the mToken/USD rate is the rate in payment tokens
        _requireStableToken(paymentToken);

        uint256 amountMToken = request.remaining;

        // a deposit in mToken counts as mToken that the wallet gave in advance:
        // a claim burns it and pays for it at the request rate
        if (request.depositAsset == address(mToken)) {
            amountMToken += request.depositLeft;
        }

        // the token fee is never transferred. It only makes `reserved` smaller
        reserved = _truncate(
            (amountMToken * rate * (ONE_HUNDRED_PERCENT - request.feePercent)) /
                (10**18 * ONE_HUNDRED_PERCENT),
            _tokenDecimals(paymentToken)
        );

        require(reserved > 0, IManageableVault.InvalidAmount());

        uint256 previous = request.reserved;

        if (reserved > previous) {
            uint256 required = reserved - previous;
            uint256 free = freeLiquidity(paymentToken);

            require(
                free >= required,
                InsufficientFreeLiquidity(paymentToken, free, required)
            );

            held[paymentToken] += required;
        } else {
            held[paymentToken] -= previous - reserved;
        }

        request.rate = rate;
        request.reserved = reserved;
    }

    /**
     * @dev claim logic
     * a claim reads nothing from the linked vault and no data feed,
     * so a change there after processing cannot stop a claim.
     * It does not check the deadline
     * @param requestId request id
     * @param amountMToken amount of mToken to claim (decimals 18)
     * @param minReceiveAmount minimum amount of payment token to receive (decimals 18)
     * @param recipient address that receives the payment token and the deposit share
     * @return amount of payment token that was paid in original decimals
     */
    function _claim(
        uint256 requestId,
        uint256 amountMToken,
        uint256 minReceiveAmount,
        address recipient
    ) private returns (uint256) {
        _validateUserAccess(msg.sender, true);

        if (recipient != msg.sender) {
            _validateUserAccess(recipient, false);
        }

        FullRedemptionRequest storage request = _getRequest(requestId);

        require(
            request.wallet == msg.sender,
            NotRequestWallet(requestId, msg.sender)
        );
        _requireProcessed(requestId, request.status);
        require(!request.paused, RequestIsPaused(requestId));

        uint256 remaining = request.remaining;

        require(amountMToken > 0, IManageableVault.InvalidAmount());
        require(
            amountMToken <= remaining,
            AmountExceedsRemaining(amountMToken, remaining)
        );

        address paymentToken = request.paymentToken;
        address depositAsset = request.depositAsset;

        // a claim of x mTokens takes the share x / remaining of what is left.
        // Rounding is down, the rest stays in the request for the next claim.
        // The last claim has x == remaining and takes all that is left
        uint256 payout = _truncate(
            (request.reserved * amountMToken) / remaining,
            _tokenDecimals(paymentToken)
        );
        uint256 depositShare = _truncate(
            (request.depositLeft * amountMToken) / remaining,
            _tokenDecimals(depositAsset)
        );

        // a claim that pays nothing would only burn mTokens
        require(payout > 0, IManageableVault.InvalidAmount());
        require(
            payout >= minReceiveAmount,
            IManageableVault.SlippageExceeded(minReceiveAmount, payout)
        );

        request.remaining = remaining - amountMToken;
        request.reserved -= payout;
        request.depositLeft -= depositShare;
        held[paymentToken] -= payout;
        held[depositAsset] -= depositShare;

        bool isLastClaim = amountMToken == remaining;
        uint256 serviceFee;

        if (isLastClaim) {
            request.status = FullRedemptionStatus.Completed;
            serviceFee = _releaseServiceFee(request);
        } else {
            request.status = FullRedemptionStatus.PartiallyRedeemed;
        }

        mToken.burn(msg.sender, amountMToken);

        if (depositAsset != address(mToken)) {
            _tokenTransfer(depositAsset, recipient, depositShare);
        } else if (depositShare > 0) {
            // the payment tokens for this share of the deposit
            // are a part of `payout`: `reserved` includes them
            mToken.burn(address(this), depositShare);
        }

        _tokenTransfer(paymentToken, recipient, payout);

        emit Redeemed(requestId, msg.sender, recipient, amountMToken, payout);
        emit DepositReturned(requestId, depositShare);

        if (isLastClaim) {
            emit RequestCompleted(requestId);
            _transferServiceFee(requestId, depositAsset, serviceFee);
        }

        // same as `redeemInstant` of the redemption vault
        return payout.convertFromBase18(_tokenDecimals(paymentToken));
    }

    /**
     * @dev takes the service fee out of the request and out of `held`
     * @param request request
     * @return serviceFee service fee amount (decimals 18)
     */
    function _releaseServiceFee(FullRedemptionRequest storage request)
        private
        returns (uint256 serviceFee)
    {
        serviceFee = request.serviceFee;
        request.serviceFee = 0;
        held[request.depositAsset] -= serviceFee;
    }

    /**
     * @dev sends the service fee of a request to `serviceFeeReceiver`
     * @param requestId request id
     * @param depositAsset token of the service fee
     * @param serviceFee service fee amount (decimals 18)
     */
    function _transferServiceFee(
        uint256 requestId,
        address depositAsset,
        uint256 serviceFee
    ) private {
        address receiver = serviceFeeReceiver;

        _tokenTransfer(depositAsset, receiver, serviceFee);

        emit ServiceFeeTransferred(requestId, receiver, serviceFee);
    }

    /**
     * @dev sends `amount` of `token` from the contract to `to`
     * @param token address of token
     * @param to address
     * @param amount amount of `token` (decimals 18)
     */
    function _tokenTransfer(
        address token,
        address to,
        uint256 amount
    ) private {
        _tokenTransferFromTo(
            token,
            address(this),
            to,
            amount,
            _tokenDecimals(token)
        );
    }

    /**
     * @dev do safeTransfer or safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision.
     * Same as in ManageableVault
     * @param token address of token
     * @param from address. If its address(this) the safeTransfer will be used
     * instead of safeTransferFrom
     * @param to address
     * @param amount amount of `token` (decimals 18)
     * @param tokenDecimals token decimals
     */
    function _tokenTransferFromTo(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) private {
        if (amount == 0) return;

        uint256 transferAmount = amount.convertFromBase18(tokenDecimals);
        uint256 truncatedAmount = transferAmount.convertToBase18(tokenDecimals);

        require(
            amount == truncatedAmount,
            IManageableVault.InvalidRounding(amount, truncatedAmount)
        );

        if (from == address(this)) {
            IERC20(token).safeTransfer(to, transferAmount);
        } else {
            IERC20(token).safeTransferFrom(from, to, transferAmount);
        }
    }

    /**
     * @dev validates that `user` passes the greenlist, the blacklist
     * and the sanctions list. Same as in ManageableVault
     * @param user user address
     * @param validatePaused if true, validates if function is not paused
     */
    function _validateUserAccess(address user, bool validatePaused)
        private
        view
        onlyGreenlisted(user)
        onlyNotBlacklisted(user)
        onlyNotSanctioned(user)
    {
        require(user != address(0), InvalidAddress(user));
        if (!validatePaused) return;
        PauseGuardsLibrary.requireNotPaused(accessControl, msg.sig);
    }

    /**
     * @dev returns the request and validates that it exists
     * @param requestId request id
     * @return request request
     */
    function _getRequest(uint256 requestId)
        private
        view
        returns (FullRedemptionRequest storage request)
    {
        request = _requests[requestId];

        require(
            request.wallet != address(0),
            IManageableVault.RequestNotExists(requestId)
        );
    }

    /**
     * @dev returns the request and validates that it exists and is not final
     * @param requestId request id
     * @return request request
     */
    function _getNotFinalRequest(uint256 requestId)
        private
        view
        returns (FullRedemptionRequest storage request)
    {
        request = _getRequest(requestId);

        FullRedemptionStatus status = request.status;

        require(
            status == FullRedemptionStatus.Submitted ||
                status == FullRedemptionStatus.ReadyToRedeem ||
                status == FullRedemptionStatus.PartiallyRedeemed,
            InvalidRequestStatus(requestId, status)
        );
    }

    /**
     * @dev pause manager of the access control
     * @return pause manager
     */
    function _pauseManager() private view returns (IMidasPauseManager) {
        return IMidasPauseManager(accessControl.pauseManager());
    }

    /**
     * @dev validates that the request is processed and not final
     * @param requestId request id
     * @param status actual request status
     */
    function _requireProcessed(uint256 requestId, FullRedemptionStatus status)
        private
        pure
    {
        require(
            status == FullRedemptionStatus.ReadyToRedeem ||
                status == FullRedemptionStatus.PartiallyRedeemed,
            InvalidRequestStatus(requestId, status)
        );
    }

    /**
     * @dev validates that `rate` differs from `referenceRate`
     * by `toleranceBps` at most. Same as `_requireVariationTolerance`
     * in ManageableVault
     * @param referenceRate rate to compare with
     * @param rate rate to validate
     * @param toleranceBps largest allowed difference, 1% = 100
     */
    function _requireRateWithin(
        uint256 referenceRate,
        uint256 rate,
        uint256 toleranceBps
    ) private pure {
        uint256 difference = rate >= referenceRate
            ? rate - referenceRate
            : referenceRate - rate;

        uint256 differenceBps = (difference * ONE_HUNDRED_PERCENT) /
            referenceRate;

        require(
            differenceBps <= toleranceBps,
            IManageableVault.PriceVariationExceeded(differenceBps, toleranceBps)
        );
    }

    /**
     * @dev validates that `token` is a stable payment token of the linked vault
     * and that its data feed is healthy. The data feed reverts when
     * the price is out of its expected range
     * @param token address of token
     * @return fee token fee percent, 1% = 100
     */
    function _requireStableToken(address token)
        private
        view
        returns (uint256 fee)
    {
        address dataFeed;
        bool stable;

        (dataFeed, fee, , stable) = redemptionVault.tokensConfig(token);

        // the linked vault deletes the config of a removed payment token
        require(
            dataFeed != address(0),
            IManageableVault.UnknownPaymentToken(token)
        );
        require(stable, PaymentTokenNotStable(token));

        IDataFeed(dataFeed).getDataInBase18();
    }

    /**
     * @dev gets and validates the mToken/USD rate of the linked vault
     * @return rate mToken/USD rate (decimals 18)
     */
    function _getMTokenRate() private view returns (uint256 rate) {
        rate = redemptionVault.mTokenDataFeed().getDataInBase18();

        require(rate > 0, IManageableVault.InvalidTokenRate(rate));
    }

    /**
     * @dev retreives decimals of a given `token`
     * @param token address of token
     * @return decimals decimals value of a given `token`
     */
    function _tokenDecimals(address token) private view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /**
     * @dev rounds `value` down to `decimals` precision
     * @param value value (decimals 18)
     * @param decimals decimals
     * @return rounded value (decimals 18)
     */
    function _truncate(uint256 value, uint256 decimals)
        private
        pure
        returns (uint256)
    {
        return value.convertFromBase18(decimals).convertToBase18(decimals);
    }
}
