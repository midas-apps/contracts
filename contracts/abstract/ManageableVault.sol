// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.34;

import {IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

import {SafeERC20Upgradeable as SafeERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {EnumerableSetUpgradeable as EnumerableSet} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

import {IManageableVault, TokenConfig, CommonVaultInitParams} from "../interfaces/IManageableVault.sol";
import {IMToken} from "../interfaces/IMToken.sol";
import {IDataFeed} from "../interfaces/IDataFeed.sol";

import {Greenlistable} from "../access/Greenlistable.sol";
import {Blacklistable} from "../access/Blacklistable.sol";
import {WithSanctionsList} from "../abstract/WithSanctionsList.sol";

import {DecimalsCorrectionLibrary} from "../libraries/DecimalsCorrectionLibrary.sol";
import {IMidasAccessControlManaged} from "../interfaces/IMidasAccessControlManaged.sol";
import {PauseUtilsLibrary} from "../libraries/PauseUtilsLibrary.sol";
import {WithMidasAccessControl} from "../access/WithMidasAccessControl.sol";

import {RateLimitLibrary} from "../libraries/RateLimitLibrary.sol";
import {MidasInitializable} from "./MidasInitializable.sol";

/**
 * @title ManageableVault
 * @author RedDuck Software
 * @notice Contract with base Vault methods
 */
abstract contract ManageableVault is
    IManageableVault,
    Blacklistable,
    Greenlistable,
    WithSanctionsList
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using DecimalsCorrectionLibrary for uint256;
    using SafeERC20 for IERC20;
    using RateLimitLibrary for RateLimitLibrary.WindowRateLimits;

    /**
     * @notice stable coin static rate 1:1 USD in 18 decimals
     */
    uint256 public constant STABLECOIN_RATE = 10**18;

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
     * @notice mapping, token address to token config
     */
    mapping(address => TokenConfig) public tokensConfig;

    /**
     * @notice mapping, user address => is free frmo min amounts
     */
    mapping(address => bool) public isFreeFromMinAmount;

    /**
     * @notice address restriction with zero fees
     */
    mapping(address => bool) public override waivedFeeRestriction;

    /**
     * @dev tokens that can be used as USD representation
     */
    EnumerableSet.AddressSet internal _paymentTokens;

    /**
     * @notice instant rate limits state
     */
    RateLimitLibrary.WindowRateLimits private _instantRateLimits;

    /**
     * @notice last request id
     */
    uint256 public currentRequestId;

    /**
     * @notice next expected request id to process
     */
    uint256 public nextExpectedRequestIdToProcess;

    /**
     * @notice max requestId that can be approved
     */
    uint256 public maxApproveRequestId;

    /**
     * @notice mToken token
     */
    IMToken public mToken;

    /**
     * @notice mToken data feed contract
     */
    IDataFeed public mTokenDataFeed;

    /**
     * @notice address to which tokens and mTokens will be sent
     */
    address public tokensReceiver;

    /**
     * @notice variation tolerance of tokenOut rates for "safe" requests approve
     */
    uint256 public variationTolerance;

    /**
     * @notice basic min operations amount
     */
    uint256 public minAmount;

    /**
     * @dev fee for initial operations 1% = 100
     */
    uint256 public instantFee;

    /**
     * @notice minimum instant fee
     */
    uint256 public minInstantFee;

    /**
     * @notice maximum instant fee
     */
    uint256 public maxInstantFee;

    /**
     * @notice maximum instant share value in basis points (100 = 1%)
     */
    uint256 public maxInstantShare;

    /**
     * @notice enforce sequential request processing flag
     */
    bool public sequentialRequestProcessing;

    /**
     * @dev leaving a storage gap for futures updates
     */
    uint256[50] private __gap;

    /**
     * @dev validate msg.sender and recipient access, validates if function is not paused
     * @param recipient recipient address
     */
    modifier validateUserAccess(address recipient) {
        _validateUserAccess(msg.sender, recipient);
        _;
    }

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
     * @dev upgradeable pattern contract`s initializer
     * @param _commonVaultInitParams init params for common vault
     */
    // solhint-disable func-name-mixedcase
    function __ManageableVault_init(
        CommonVaultInitParams calldata _commonVaultInitParams
    ) internal onlyInitializing {
        __WithMidasAccessControl_init(_commonVaultInitParams.ac);
        __WithSanctionsList_init_unchained(
            _commonVaultInitParams.sanctionsList
        );

        _validateAddress(_commonVaultInitParams.mToken, false);
        _validateAddress(_commonVaultInitParams.mTokenDataFeed, false);
        _validateAddress(_commonVaultInitParams.tokensReceiver, true);
        _validateFee(_commonVaultInitParams.variationTolerance, true);
        _validateFee(_commonVaultInitParams.instantFee, false);
        _validateFee(_commonVaultInitParams.maxInstantShare, false);

        mToken = IMToken(_commonVaultInitParams.mToken);

        tokensReceiver = _commonVaultInitParams.tokensReceiver;
        instantFee = _commonVaultInitParams.instantFee;
        minAmount = _commonVaultInitParams.minAmount;
        variationTolerance = _commonVaultInitParams.variationTolerance;
        mTokenDataFeed = IDataFeed(_commonVaultInitParams.mTokenDataFeed);
        sequentialRequestProcessing = _commonVaultInitParams
            .sequentialRequestProcessing;

        maxInstantShare = _commonVaultInitParams.maxInstantShare;
        maxApproveRequestId = _commonVaultInitParams.maxApproveRequestId;

        _setMinMaxInstantFee(
            _commonVaultInitParams.minInstantFee,
            _commonVaultInitParams.maxInstantFee
        );
    }

    /**
     * @inheritdoc IManageableVault
     */
    function addPaymentToken(
        address token,
        address dataFeed,
        uint256 tokenFee,
        uint256 allowance,
        bool stable
    ) external onlyContractAdmin {
        require(_paymentTokens.add(token), PaymentTokenAlreadyAdded(token));
        _validateAddress(dataFeed, false);
        _validateFee(tokenFee, false);

        tokensConfig[token] = TokenConfig({
            dataFeed: dataFeed,
            fee: tokenFee,
            allowance: allowance,
            stable: stable
        });
        emit AddPaymentToken(token, dataFeed, tokenFee, allowance, stable);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if token is not presented
     */
    function removePaymentToken(address token) external onlyContractAdmin {
        require(_paymentTokens.remove(token), PaymentTokenNotExists(token));
        delete tokensConfig[token];
        emit RemovePaymentToken(token);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function changeTokenAllowance(address token, uint256 allowance)
        external
        onlyContractAdmin
    {
        _requireTokenExists(token);

        tokensConfig[token].allowance = allowance;
        emit ChangeTokenAllowance(token, allowance);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if new fee > 100%
     */
    function changeTokenFee(address token, uint256 fee)
        external
        onlyContractAdmin
    {
        _requireTokenExists(token);
        _validateFee(fee, false);

        tokensConfig[token].fee = fee;
        emit ChangeTokenFee(token, fee);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts if new tolerance > 100%
     */
    function setVariationTolerance(uint256 tolerance)
        external
        onlyContractAdmin
    {
        _validateFee(tolerance, false);

        variationTolerance = tolerance;
        emit SetVariationTolerance(tolerance);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMinAmount(uint256 newAmount) external onlyContractAdmin {
        minAmount = newAmount;
        emit SetMinAmount(newAmount);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setWaivedFeeAccount(address account, bool enable)
        external
        onlyContractAdmin
    {
        require(waivedFeeRestriction[account] != enable, SameBoolValue(enable));
        waivedFeeRestriction[account] = enable;
        emit SetWaivedFeeAccount(account, enable);
    }

    /**
     * @inheritdoc IManageableVault
     * @dev reverts address zero or equal address(this)
     */
    function setTokensReceiver(address receiver) external onlyContractAdmin {
        _validateAddress(receiver, true);

        tokensReceiver = receiver;

        emit SetTokensReceiver(receiver);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInstantFee(uint256 newInstantFee) external onlyContractAdmin {
        _validateFee(newInstantFee, false);

        instantFee = newInstantFee;
        emit SetInstantFee(newInstantFee);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMinMaxInstantFee(
        uint256 newMinInstantFee,
        uint256 newMaxInstantFee
    ) external onlyContractAdmin {
        _setMinMaxInstantFee(newMinInstantFee, newMaxInstantFee);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMaxInstantShare(uint256 newMaxInstantShare)
        external
        onlyContractAdmin
    {
        _validateFee(newMaxInstantShare, false);
        maxInstantShare = newMaxInstantShare;
        emit SetMaxInstantShare(newMaxInstantShare);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setMaxApproveRequestId(uint256 newMaxApproveRequestId)
        external
        onlyContractAdmin
    {
        maxApproveRequestId = newMaxApproveRequestId;
        emit SetMaxApproveRequestId(newMaxApproveRequestId);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setInstantLimitConfig(uint256 window, uint256 limit)
        external
        onlyContractAdmin
    {
        _instantRateLimits.setWindowLimit(window, limit);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function removeInstantLimitConfig(uint256 window)
        external
        onlyContractAdmin
    {
        _instantRateLimits.removeWindowLimit(window);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function freeFromMinAmount(address user, bool enable)
        external
        onlyContractAdmin
    {
        require(isFreeFromMinAmount[user] != enable, SameAddressValue(user));

        isFreeFromMinAmount[user] = enable;

        emit FreeFromMinAmount(user, enable);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function setSequentialRequestProcessing(bool enforce)
        external
        onlyContractAdmin
    {
        require(sequentialRequestProcessing != enforce, SameBoolValue(enforce));
        sequentialRequestProcessing = enforce;
        emit SetSequentialRequestProcessing(enforce);
    }

    /**
     * @inheritdoc IManageableVault
     */
    function withdrawToken(address token, uint256 amount)
        external
        onlyContractAdmin
    {
        address withdrawTo = tokensReceiver;
        IERC20(token).safeTransfer(withdrawTo, amount);
        emit WithdrawToken(token, withdrawTo, amount);
    }

    /**
     * @notice returns array of stablecoins supported by the vault
     * can be called only from permissioned actor.
     * @return paymentTokens array of payment tokens
     */
    function getPaymentTokens() external view returns (address[] memory) {
        return _paymentTokens.values();
    }

    /**
     * @notice returns array of instant rate limit statuses
     * @return statuses array of instant rate limit statuses
     */
    function getInstantLimitStatuses()
        external
        view
        returns (
            RateLimitLibrary.WindowRateLimitStatus[] memory /* statuses */
        )
    {
        return _instantRateLimits.getWindowStatuses();
    }

    /**
     * @inheritdoc Greenlistable
     */
    function greenlistedRole() public view virtual override returns (bytes32) {
        return _GREENLISTED_ROLE;
    }

    /**
     * @dev set minimum/maximum instant fee
     * @param newMinInstantFee new minimum instant fee
     * @param newMaxInstantFee new maximum instant fee
     */
    function _setMinMaxInstantFee(
        uint256 newMinInstantFee,
        uint256 newMaxInstantFee
    ) private {
        _validateFee(newMinInstantFee, false);
        _validateFee(newMaxInstantFee, false);
        require(
            newMinInstantFee <= newMaxInstantFee,
            InvalidMinMaxInstantFee(newMinInstantFee, newMaxInstantFee)
        );
        minInstantFee = newMinInstantFee;
        maxInstantFee = newMaxInstantFee;
        emit SetMinMaxInstantFee(newMinInstantFee, newMaxInstantFee);
    }

    /**
     * @dev do safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision. Sends tokens
     * from `msg.sender` to `tokensReceiver`
     * @param token address of token
     * @param to address of user
     * @param amount amount of `token` to transfer from `user` (decimals 18)
     * @param tokenDecimals token decimals
     */
    function _tokenTransferFromUser(
        address token,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) internal returns (uint256 transferAmount) {
        return
            _tokenTransferFromTo(token, msg.sender, to, amount, tokenDecimals);
    }

    /**
     * @dev do safeTransfer or safeTransferFrom on a given token
     * and converts `amount` from base18
     * to amount with a correct precision.
     * @param token address of token
     * @param from address. If its address(this) the safeTransfer will be used
     * instead of safeTransferFrom
     * @param to address
     * @param amount amount of `token` to transfer from `user`
     * @param tokenDecimals token decimals
     */
    function _tokenTransferFromTo(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 tokenDecimals
    ) internal returns (uint256 transferAmount) {
        if (amount == 0) return 0;
        transferAmount = amount.convertFromBase18(tokenDecimals);
        uint256 truncatedAmount = transferAmount.convertToBase18(tokenDecimals);

        require(
            amount == truncatedAmount,
            InvalidRounding(amount, truncatedAmount)
        );

        if (from == address(this)) {
            IERC20(token).safeTransfer(to, transferAmount);
        } else {
            IERC20(token).safeTransferFrom(from, to, transferAmount);
        }
    }

    /**
     * @dev check if operation exceed daily limit and update limit data
     * @param amount operation amount (decimals 18)
     */
    function _requireAndUpdateLimit(uint256 amount) internal {
        _instantRateLimits.consumeLimit(amount);
    }

    /**
     * @dev check if request id is sequential and update next expected request id to process
     * @param requestId request id
     * @param revertIfInvalid if true, reverts if request id is not sequential, otherwise returns false
     * @return isValid true if request id is sequential or sequentialRequestProcessing is disabled
     */
    function _validateAndUpdateNextRequestIdToProcess(
        uint256 requestId,
        bool revertIfInvalid
    ) internal returns (bool isValid) {
        isValid = true;

        if (!_validateMaxApproveRequestId(requestId, revertIfInvalid)) {
            return false;
        }

        uint256 _nextExpectedRequestIdToProcess = nextExpectedRequestIdToProcess;

        if (
            sequentialRequestProcessing &&
            requestId != _nextExpectedRequestIdToProcess
        ) {
            isValid = false;
        }

        if (!revertIfInvalid && !isValid) {
            return false;
        }

        require(
            isValid,
            InvalidRequestSequence(requestId, _nextExpectedRequestIdToProcess)
        );

        if (requestId >= _nextExpectedRequestIdToProcess) {
            nextExpectedRequestIdToProcess = requestId + 1;
        }
    }

    /**
     * @dev retreives decimals of a given `token`
     * @param token address of token
     * @return decimals decinmals value of a given `token`
     */
    function _tokenDecimals(address token) internal view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    /**
     * @dev checks that `token` is presented in `_paymentTokens`
     * @param token address of token
     */
    function _requireTokenExists(address token) internal view virtual {
        require(_paymentTokens.contains(token), UnknownPaymentToken(token));
    }

    /**
     * @dev check if operation exceed token allowance and update allowance
     * @param token address of token
     * @param amount operation amount (decimals 18)
     */
    function _requireAndUpdateAllowance(address token, uint256 amount)
        internal
    {
        uint256 prevAllowance = tokensConfig[token].allowance;
        if (prevAllowance == type(uint256).max) return;

        require(
            prevAllowance >= amount,
            AllowanceExceeded(prevAllowance, amount)
        );

        tokensConfig[token].allowance -= amount;
    }

    /**
     * @dev returns calculated fee amount depends on the provided fee percent and amount
     * @param feePercent fee percent
     * @param amount amount of token (decimals 18)

     * @return feeAmount calculated fee amount
     */
    function _getFeeAmount(uint256 feePercent, uint256 amount)
        internal
        pure
        returns (uint256)
    {
        return (amount * feePercent) / ONE_HUNDRED_PERCENT;
    }

    /**
     * @dev returns calculated fee percent depends on parameters
     * @param sender sender address
     * @param token token address
     * @param isInstant is instant operation
     *
     * @return feePercent calculated fee percent
     */
    function _getFee(
        address sender,
        address token,
        bool isInstant
    ) internal view returns (uint256 feePercent) {
        if (waivedFeeRestriction[sender]) return 0;

        feePercent = tokensConfig[token].fee;

        if (isInstant) feePercent += instantFee;

        if (feePercent > ONE_HUNDRED_PERCENT) feePercent = ONE_HUNDRED_PERCENT;
    }

    /**
     * @dev validates instant fee is within the range of min/max instant fee
     */
    function _validateInstantFee() internal view {
        uint256 currentInstantFee = instantFee;
        require(
            currentInstantFee >= minInstantFee &&
                currentInstantFee <= maxInstantFee,
            InstantFeeOutOfBounds(currentInstantFee)
        );
    }

    /**
     * @dev check if prev and new prices diviation fit variationTolerance
     * @param prevPrice previous rate
     * @param newPrice new rate
     */
    function _requireVariationTolerance(uint256 prevPrice, uint256 newPrice)
        internal
        view
    {
        uint256 priceDif = newPrice >= prevPrice
            ? newPrice - prevPrice
            : prevPrice - newPrice;

        uint256 priceDifPercent = (priceDif * ONE_HUNDRED_PERCENT) / prevPrice;

        require(
            priceDifPercent <= variationTolerance,
            PriceVariationExceeded(priceDifPercent, variationTolerance)
        );
    }

    /**
     * @dev validates that inputted mToken amount is >= minAmount()
     * only if the `user` is not free from min amount
     * @param user user address
     * @param amountMToken amount of mToken
     * @return isFreeFromMinAmount if the `user` is free from min amount
     */
    function _validateMTokenAmount(address user, uint256 amountMToken)
        internal
        view
        returns (
            bool /* isFreeFromMinAmount */
        )
    {
        require(amountMToken > 0, InvalidAmount());

        if (isFreeFromMinAmount[user]) {
            return true;
        }

        require(
            amountMToken >= minAmount,
            AmountLessThanMin(amountMToken, minAmount)
        );

        return false;
    }

    /**
     * @dev validate user access
     * @param user user address
     * @param validatePaused if true, validates if function is not paused
     */
    function _validateUserAccess(address user, bool validatePaused)
        internal
        view
        onlyGreenlisted(user)
        onlyNotBlacklisted(user)
        onlyNotSanctioned(user)
    {
        require(user != address(0), InvalidAddress(user));
        if (!validatePaused) return;
        PauseUtilsLibrary.requireNotPaused(accessControl, msg.sig);
    }

    /**
     * @dev validate user access and validates if function is not paused
     * @param user user address
     * @param recipient recipient address
     */
    function _validateUserAccess(address user, address recipient)
        internal
        view
    {
        _validateUserAccess(user, true);

        if (recipient != user) {
            _validateUserAccess(recipient, false);
        }
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
     */
    function _validateFunctionAccessWithTimelock(
        bytes32 role,
        uint32 overrideDelay,
        bool roleIsFunctionOperator,
        address account,
        bool validateFunctionRole
    ) internal view override {
        PauseUtilsLibrary.requireFnNotPaused(accessControl, msg.sig);

        super._validateFunctionAccessWithTimelock(
            role,
            overrideDelay,
            roleIsFunctionOperator,
            account,
            validateFunctionRole
        );
    }

    /**
     * @dev convert value to inputted decimals precision
     * @param value value for format
     * @param decimals decimals
     * @return converted amount
     */
    function _truncate(uint256 value, uint256 decimals)
        internal
        pure
        returns (uint256)
    {
        return value.convertFromBase18(decimals).convertToBase18(decimals);
    }

    /**
     * @dev check if fee <= 100% and check > 0 if needs
     * @param fee fee value
     * @param checkMin if need to check minimum
     */
    function _validateFee(uint256 fee, bool checkMin) internal pure {
        require(fee <= ONE_HUNDRED_PERCENT, InvalidFee(fee));
        if (checkMin) require(fee > 0, InvalidFee(fee));
    }

    /**
     * @dev check if address not zero and not address(this)
     * @param addr address to check
     * @param selfCheck check if address not address(this)
     */
    function _validateAddress(address addr, bool selfCheck) internal view {
        require(addr != address(0), InvalidAddress(addr));
        if (selfCheck) require(addr != address(this), InvalidAddress(addr));
    }

    /**
     * @dev get token rate depends on data feed and stablecoin flag
     * @param dataFeed address of dataFeed from token config
     * @param stable is stablecoin
     */
    function _getTokenRate(address dataFeed, bool stable)
        internal
        view
        virtual
        returns (uint256)
    {
        // @dev if dataFeed returns rate, all peg checks passed
        uint256 rate = IDataFeed(dataFeed).getDataInBase18();

        if (stable) return STABLECOIN_RATE;

        return rate;
    }

    /**
     * @dev gets and validates mToken rate
     * @return mTokenRate mToken rate
     */
    function _getMTokenRate() internal view returns (uint256 mTokenRate) {
        mTokenRate = _getTokenRate(address(mTokenDataFeed), false);
        _validateTokenRate(mTokenRate);
    }

    /**
     * @dev gets and validates pToken rate
     * @param token address of pToken
     * @return tokenRate token rate
     */
    function _getPTokenRate(address token)
        internal
        view
        returns (uint256 tokenRate)
    {
        TokenConfig storage tokenConfig = tokensConfig[token];
        tokenRate = _getTokenRate(tokenConfig.dataFeed, tokenConfig.stable);
        _validateTokenRate(tokenRate);
    }

    /**
     * @dev validates that actual receive amount is greater than or equal to minimum receive amount
     * @param actualReceiveAmount actual receive amount
     * @param minReceiveAmount minimum receive amount
     */
    function _requireSlippageNotExceeded(
        uint256 actualReceiveAmount,
        uint256 minReceiveAmount
    ) internal pure {
        require(
            actualReceiveAmount >= minReceiveAmount,
            SlippageExceeded(minReceiveAmount, actualReceiveAmount)
        );
    }

    /**
     * @dev validates that request id is less than or equal to max approve request id
     * @param requestId request id
     */
    function _validateMaxApproveRequestId(
        uint256 requestId,
        bool revertIfInvalid
    ) internal view returns (bool isValid) {
        isValid = requestId <= maxApproveRequestId;

        if (revertIfInvalid) {
            require(isValid, RequestIdTooHigh(requestId, maxApproveRequestId));
        }
    }

    /**
     * @dev validates token rate
     * @param rate token rate
     */
    function _validateTokenRate(uint256 rate) private pure {
        require(rate > 0, InvalidTokenRate(rate));
    }
}
